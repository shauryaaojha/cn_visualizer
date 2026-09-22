// ---------------------------------------------------------------------------
// addressEngine — 32-bit binary arithmetic and address space carving.
//
// Pure functions only. Computes accurate IPv4 bit layouts, boundary splits,
// network/broadcast derivations, and hierarchical VLSM address carves.
// Scrubbable, deterministic, zero React or unseeded state.
// ---------------------------------------------------------------------------

import { CHALK_SERIES } from "../lib/palette.ts";
import type {
  AddrBlock,
  AddrFact,
  AddrGridRow,
  AddrOctet,
  AddrProgram,
  AddrSpaceBar,
  AddrStep,
  CellState,
  DataTable,
  Fault,
} from "@/types/visualization";

// --- Mathematical helpers ---------------------------------------------------

const PLACE_VALUES = [128, 64, 32, 16, 8, 4, 2, 1] as const;

export function isValidIp(ip: string): boolean {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    if (!/^\d+$/.test(p)) return false;
    const n = Number(p);
    return n >= 0 && n <= 255;
  });
}

export function ipToInt(ip: string): number {
  const parts = ip.trim().split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255)) {
    return 0;
  }
  return (((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0);
}

export function intToIp(val: number): string {
  const u = val >>> 0;
  return [
    (u >>> 24) & 255,
    (u >>> 16) & 255,
    (u >>> 8) & 255,
    u & 255,
  ].join(".");
}

export function clampPrefix(p: number, min = 0, max = 32): number {
  if (isNaN(p)) return 24;
  return Math.max(min, Math.min(max, Math.round(p)));
}

export function maskFromPrefix(prefix: number): number {
  const p = clampPrefix(prefix);
  if (p === 0) return 0;
  if (p === 32) return 0xffffffff >>> 0;
  return ((0xffffffff << (32 - p)) >>> 0);
}

export function prefixFromMask(maskInt: number): number {
  let count = 0;
  let m = maskInt >>> 0;
  while (m & 0x80000000) {
    count++;
    m = (m << 1) >>> 0;
  }
  return count;
}

export function octetToBits(val: number): (0 | 1)[] {
  const v = Math.max(0, Math.min(255, val));
  const res: (0 | 1)[] = [];
  for (let i = 7; i >= 0; i--) {
    res.push(((v >>> i) & 1) as 0 | 1);
  }
  return res;
}

export function parseCidr(cidr: string): { ip: string; prefix: number } | null {
  const [ipPart, prefixPart] = cidr.trim().split("/");
  if (!ipPart || prefixPart === undefined || !isValidIp(ipPart)) return null;
  const prefix = Number(prefixPart);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return null;
  return { ip: ipPart, prefix };
}

export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n && p < 0x80000000) {
    p <<= 1;
  }
  return p >>> 0;
}

export function deriveClass(firstOctet: number): "A" | "B" | "C" | "D" | "E" {
  if (firstOctet <= 127) return "A";
  if (firstOctet <= 191) return "B";
  if (firstOctet <= 223) return "C";
  if (firstOctet <= 239) return "D";
  return "E";
}

export function defaultMaskForClass(cls: "A" | "B" | "C" | "D" | "E"): string {
  switch (cls) {
    case "A":
      return "255.0.0.0 (/8)";
    case "B":
      return "255.255.0.0 (/16)";
    case "C":
      return "255.255.255.0 (/24)";
    case "D":
      return "Multicast (N/A)";
    case "E":
      return "Reserved (N/A)";
  }
}

export function computeUsableHosts(prefix: number): number {
  const p = clampPrefix(prefix);
  if (p >= 31) return 0;
  return Math.pow(2, 32 - p) - 2;
}

// --- Parameter Types and Defaults -------------------------------------------

export interface Ipv4AddressingParams {
  ip: string;
  prefix: number;
  faults: Fault[];
}

export interface VlsmDept {
  id: string;
  name: string;
  hostsNeeded: number;
}

export interface VlsmParams {
  baseBlock: string;
  departments: VlsmDept[];
  faults: Fault[];
}

export type AddressRunParams =
  | ({ op: "ipv4Addressing" } & Ipv4AddressingParams)
  | ({ op: "vlsm" } & VlsmParams);

export const ADDRESS_DEFAULTS = {
  ipv4Addressing: {
    ip: "192.168.1.25",
    prefix: 24,
    faults: [] as Fault[],
  },
  vlsm: {
    baseBlock: "192.168.1.0/24",
    departments: [
      { id: "dept-eng", name: "Engineering", hostsNeeded: 100 },
      { id: "dept-sales", name: "Sales", hostsNeeded: 50 },
      { id: "dept-supp", name: "Support", hostsNeeded: 20 },
      { id: "dept-ops", name: "Ops", hostsNeeded: 10 },
    ],
    faults: [] as Fault[],
  },
};

// --- Operation 1: ipv4Addressing --------------------------------------------

const IPV4_PSEUDOCODE = [
  "parse dotted-decimal string into four 8-bit octets",
  "expand each octet to 8 bits using binary place values (128..1)",
  "assemble contiguous 32-bit sequence",
  "place prefix boundary after bit /N",
  "partition into N network bits and (32 - N) host bits",
  "compute network address: all host bits set to 0",
  "compute broadcast address: all host bits set to 1",
  "derive usable host range and total capacity (2^(32-N) - 2)",
];

function buildOctetBits(
  octetVal: number,
  octetIdx: number,
  prefix: number,
  activeOctetIdx: number | null,
  highlightBitGlobalIdx: number | null = null,
  overrideHostVal?: 0 | 1,
): AddrOctet {
  const bitsRaw = octetToBits(octetVal);
  const bits = bitsRaw.map((rawBit, bitInOctet) => {
    const globalIdx = octetIdx * 8 + bitInOctet;
    const isNetwork = globalIdx < prefix;
    const role = isNetwork ? ("network" as const) : ("host" as const);
    const placeValue = PLACE_VALUES[bitInOctet];

    let val = rawBit;
    if (!isNetwork && overrideHostVal !== undefined) {
      val = overrideHostVal;
    }

    let state: CellState = "idle";
    if (highlightBitGlobalIdx !== null && globalIdx === highlightBitGlobalIdx) {
      state = "failed";
    } else if (activeOctetIdx !== null && activeOctetIdx === octetIdx) {
      state = val === 1 ? "active" : "visited";
    } else if (activeOctetIdx === -1) {
      // All active / colored
      state = isNetwork ? "visited" : "active";
    }

    return {
      val,
      role,
      state,
      placeValue,
      index: globalIdx,
    };
  });

  const decimal =
    overrideHostVal !== undefined
      ? bits.reduce((acc, b) => acc + b.val * (b.placeValue ?? 0), 0)
      : octetVal;

  let octetState: CellState = "idle";
  if (activeOctetIdx !== null && activeOctetIdx === octetIdx) {
    octetState = "active";
  }

  return {
    decimal,
    bits,
    label: `Octet ${octetIdx + 1}`,
    state: octetState,
  };
}

function buildGridRow(
  id: string,
  label: string,
  ipIntVal: number,
  prefix: number,
  activeOctetIdx: number | null,
  boundaryAfterBit: number | undefined,
  highlightBitGlobalIdx: number | null = null,
  overrideHostVal?: 0 | 1,
): AddrGridRow {
  const octets: AddrOctet[] = [];
  for (let o = 0; o < 4; o++) {
    const octetVal = (ipIntVal >>> (24 - o * 8)) & 255;
    octets.push(
      buildOctetBits(
        octetVal,
        o,
        prefix,
        activeOctetIdx,
        highlightBitGlobalIdx,
        overrideHostVal,
      ),
    );
  }
  return {
    id,
    label,
    octets,
    boundaryAfterBit,
  };
}

export function runIpv4Addressing(params: Ipv4AddressingParams): AddrProgram {
  const rawIp = isValidIp(params.ip) ? params.ip.trim() : ADDRESS_DEFAULTS.ipv4Addressing.ip;
  const prefix = clampPrefix(params.prefix);
  const origIpInt = ipToInt(rawIp);

  // Check bitFlip fault
  const bitFlipFault = params.faults.find((f) => f.kind === "bitFlip") as
    | { kind: "bitFlip"; index: number }
    | undefined;

  let effectiveIpInt = origIpInt;
  let flippedIndex: number | null = null;
  if (bitFlipFault && typeof bitFlipFault.index === "number") {
    flippedIndex = Math.max(0, Math.min(31, Math.round(bitFlipFault.index)));
    const flipMask = (1 << (31 - flippedIndex)) >>> 0;
    effectiveIpInt = (origIpInt ^ flipMask) >>> 0;
  }

  const effectiveIp = intToIp(effectiveIpInt);
  const maskInt = maskFromPrefix(prefix);
  const netInt = (effectiveIpInt & maskInt) >>> 0;
  const bcastInt = (netInt | (~maskInt >>> 0)) >>> 0;
  const netIp = intToIp(netInt);
  const bcastIp = intToIp(bcastInt);
  const usableHosts = computeUsableHosts(prefix);

  const firstOctet = (effectiveIpInt >>> 24) & 255;
  const ipClass = deriveClass(firstOctet);
  const defaultMask = defaultMaskForClass(ipClass);

  let firstHostStr = "None";
  let lastHostStr = "None";
  if (prefix <= 30) {
    firstHostStr = intToIp(netInt + 1);
    lastHostStr = intToIp(bcastInt - 1);
  }

  const fullFacts: AddrFact[] = [
    { label: "IP Address", value: `${effectiveIp}/${prefix}` },
    { label: "Subnet Mask", value: intToIp(maskInt) },
    { label: "Network Address", value: netIp, tone: "mint" },
    { label: "Broadcast Address", value: bcastIp, tone: "amber" },
    {
      label: "Usable Host Range",
      value: prefix <= 30 ? `${firstHostStr} – ${lastHostStr}` : "None (/31 or /32)",
    },
    {
      label: "Usable Hosts",
      value: usableHosts.toLocaleString("en-US"),
      tone: usableHosts > 0 ? "signal" : "coral",
    },
    { label: "Class", value: `Class ${ipClass}` },
    { label: "Default Mask", value: defaultMask },
  ];

  const steps: AddrStep[] = [];

  // Frame 1: Dotted-decimal form
  steps.push({
    description: `An IPv4 address is fundamentally a 32-bit unsigned integer, but by universal convention humans write it in dotted-decimal format: four 8-bit octets separated by dots (${effectiveIp}). Each octet can hold values from 0 to 255.`,
    codeLines: [1],
    message: { text: `Dotted decimal: 4 octets (${effectiveIp})`, tone: "info" },
    gridRows: [
      buildGridRow("row-ip", "IPv4 Address", effectiveIpInt, prefix, null, undefined),
    ],
    facts: [
      { label: "Dotted Decimal", value: effectiveIp },
      { label: "Prefix Length", value: `/${prefix}` },
      { label: "Class", value: `Class ${ipClass}` },
    ],
  });

  // Frames 2-5: Expand octets 1 through 4
  const octetVals = [
    (effectiveIpInt >>> 24) & 255,
    (effectiveIpInt >>> 16) & 255,
    (effectiveIpInt >>> 8) & 255,
    effectiveIpInt & 255,
  ];

  for (let o = 0; o < 4; o++) {
    const val = octetVals[o];
    const bits = octetToBits(val);
    const activeTerms = bits
      .map((b, idx): number | null => (b === 1 ? PLACE_VALUES[idx] : null))
      .filter((n): n is number => n !== null);
    const sumExpr = activeTerms.length > 0 ? activeTerms.join(" + ") : "0";

    steps.push({
      description: `Octet ${o + 1} (${val}): the 8 bits represent powers of two descending from 128 to 1. Summing the active place values: ${sumExpr} = ${val}.`,
      codeLines: [2],
      gridRows: [
        buildGridRow("row-ip", "IPv4 Address", effectiveIpInt, prefix, o, undefined),
      ],
      facts: [
        { label: `Octet ${o + 1} Decimal`, value: String(val) },
        { label: `Octet ${o + 1} Binary`, value: bits.join("") },
        { label: "Active Weights", value: sumExpr },
      ],
    });
  }

  // Frame 6: Contiguous 32-bit view
  steps.push({
    description: "Joined end-to-end, the four octets form a single unbroken sequence of 32 binary bits. Routers and host network stacks do not see dots or decimal digits — they manipulate this 32-bit binary integer directly.",
    codeLines: [3],
    gridRows: [
      buildGridRow("row-ip", "32-bit Address", effectiveIpInt, prefix, -1, undefined),
    ],
    facts: [
      { label: "32-Bit Binary", value: "32 contiguous bits" },
      { label: "Integer Value", value: effectiveIpInt.toLocaleString("en-US") },
      { label: "Hexadecimal", value: `0x${effectiveIpInt.toString(16).toUpperCase().padStart(8, "0")}` },
    ],
  });

  // Frame 7: Prefix Boundary Placement
  steps.push({
    description: `The prefix /${prefix} establishes a strict boundary after bit ${prefix}. Everything to the left is the network portion (identifying the subnet); everything to the right is the host portion (identifying the specific interface).`,
    codeLines: [4],
    message: { text: `Boundary at /${prefix}: ${prefix} network bits | ${32 - prefix} host bits`, tone: "info" },
    gridRows: [
      buildGridRow("row-ip", "Address & Boundary", effectiveIpInt, prefix, null, prefix),
    ],
    facts: [
      { label: "Network Bits", value: `${prefix} bits (left)` },
      { label: "Host Bits", value: `${32 - prefix} bits (right)` },
      { label: "Mask", value: intToIp(maskInt) },
    ],
  });

  // Frame 8: Network Portion vs Host Portion
  steps.push({
    description: `All hosts sharing the same physical wire or collision domain must have identical bits across the ${prefix} network bits. The remaining ${32 - prefix} host bits uniquely differentiate machines within that subnet.`,
    codeLines: [5],
    gridRows: [
      buildGridRow("row-ip", "Network vs Host", effectiveIpInt, prefix, -1, prefix),
    ],
    facts: [
      { label: "Subnet ID Bits", value: `${prefix} bits` },
      { label: "Host ID Bits", value: `${32 - prefix} bits` },
      { label: "Total Addresses", value: Math.pow(2, 32 - prefix).toLocaleString("en-US") },
    ],
  });

  // Frame 9: Derived Network Address (Host bits -> 0)
  steps.push({
    description: `Setting every host bit to 0 produces the network address: ${netIp}. This address refers to the entire network segment itself and cannot be assigned to any host network interface.`,
    codeLines: [6],
    message: { text: `Network Address: ${netIp}`, tone: "ok" },
    gridRows: [
      buildGridRow("row-net", "Network Address", effectiveIpInt, prefix, null, prefix, null, 0),
    ],
    facts: [
      { label: "Network Address", value: netIp, tone: "mint" },
      { label: "Subnet Mask", value: intToIp(maskInt) },
      { label: "Rule", value: "Host bits = all 0s" },
    ],
  });

  // Frame 10: Derived Broadcast Address (Host bits -> 1)
  steps.push({
    description: `Setting every host bit to 1 yields the directed broadcast address: ${bcastIp}. When a packet is transmitted to this IP, the local switch or router delivers it to every device connected to the subnet.`,
    codeLines: [7],
    message: { text: `Broadcast Address: ${bcastIp}`, tone: "info" },
    gridRows: [
      buildGridRow("row-bcast", "Broadcast Address", effectiveIpInt, prefix, null, prefix, null, 1),
    ],
    facts: [
      { label: "Broadcast Address", value: bcastIp, tone: "amber" },
      { label: "Network Address", value: netIp, tone: "mint" },
      { label: "Rule", value: "Host bits = all 1s" },
    ],
  });

  // Frame 11: Usable Range and Capacity
  const capacityNote =
    prefix >= 31
      ? `A /${prefix} subnet leaves ${32 - prefix} host bits. By standard convention (RFC 950), subtracting 2 for network and broadcast yields 0 usable host addresses.`
      : `The assignable host addresses lie strictly between the network and broadcast addresses: ${firstHostStr} through ${lastHostStr}. This yields 2^${32 - prefix} - 2 = ${usableHosts.toLocaleString("en-US")} usable host interfaces.`;

  steps.push({
    description: `${capacityNote} This complete 32-bit layout defines how routers filter, forward, and segment traffic.`,
    codeLines: [8],
    message: { text: `Usable hosts: ${usableHosts.toLocaleString("en-US")}`, tone: "ok" },
    gridRows: [
      buildGridRow("row-ip", "Configured Address", effectiveIpInt, prefix, -1, prefix),
    ],
    facts: fullFacts,
  });

  // Frame 12: Bit Flip Fault (if active)
  if (flippedIndex !== null) {
    const isNetworkBit = flippedIndex < prefix;
    const origBit = (origIpInt >>> (31 - flippedIndex)) & 1;
    const newBit = (effectiveIpInt >>> (31 - flippedIndex)) & 1;
    const origNet = intToIp((origIpInt & maskInt) >>> 0);

    const faultText = isNetworkBit
      ? `Bit ${flippedIndex} flipped (${origBit} → ${newBit}) in the network portion! The network address changed from ${origNet} to ${netIp}. This host now belongs to an entirely different subnet and is disconnected from its original network peers.`
      : `Bit ${flippedIndex} flipped (${origBit} → ${newBit}) in the host portion! The subnet remains ${netIp}, but the interface address changed from ${rawIp} to ${effectiveIp}. If another host already uses this address, an IP conflict occurs.`;

    steps.push({
      description: faultText,
      codeLines: [5],
      message: {
        text: isNetworkBit ? `Fault: Network changed to ${netIp}!` : `Fault: Host IP changed to ${effectiveIp}`,
        tone: isNetworkBit ? "error" : "warn",
      },
      gridRows: [
        buildGridRow(
          "row-fault",
          "Flipped Bit Effect",
          effectiveIpInt,
          prefix,
          null,
          prefix,
          flippedIndex,
        ),
      ],
      facts: [
        { label: "Flipped Bit Index", value: `Bit ${flippedIndex} (${isNetworkBit ? "Network" : "Host"})`, tone: "coral" },
        { label: "Original IP", value: rawIp },
        { label: "Modified IP", value: effectiveIp, tone: "coral" },
        { label: "Computed Network", value: netIp, tone: isNetworkBit ? "coral" : "mint" },
      ],
    });
  }

  const stats = [
    { label: "Usable hosts", value: usableHosts.toLocaleString("en-US"), tone: (usableHosts > 0 ? "mint" : "amber") as "mint" | "amber" },
    { label: "Prefix", value: `/${prefix}` },
    { label: "Network", value: netIp },
    { label: "Broadcast", value: bcastIp },
  ];

  return {
    steps,
    title: "IPv4 Addressing: 32-Bit Anatomy",
    pseudocode: IPV4_PSEUDOCODE,
    stats,
  };
}

// --- Operation 2: vlsm ------------------------------------------------------

const VLSM_PSEUDOCODE = [
  "sort subnet requirements in descending order (largest first)",
  "for each department requirement R:",
  "  compute needed size S = next_power_of_two(R + 2)",
  "  derive prefix length P = 32 - log2(S)",
  "  verify S <= remaining_unallocated_addresses",
  "  carve block [current_ptr, current_ptr + S - 1] with prefix /P",
  "  advance current_ptr += S",
  "label remaining space as free unassigned pool",
  "compare VLSM address efficiency against fixed-length FLSM",
];

interface CarvedSubnet {
  deptId: string;
  name: string;
  hostsNeeded: number;
  blockSize: number;
  prefix: number;
  startInt: number;
  endInt: number;
  netIp: string;
  bcastIp: string;
  firstHost: string;
  lastHost: string;
  usableHosts: number;
  hostsWasted: number;
  color: string;
}

export function runVlsm(params: VlsmParams): AddrProgram {
  const parsedBase = parseCidr(params.baseBlock) ?? { ip: "192.168.1.0", prefix: 24 };
  const basePrefix = clampPrefix(parsedBase.prefix, 0, 30);
  const baseMask = maskFromPrefix(basePrefix);
  let baseNetInt = (ipToInt(parsedBase.ip) & baseMask) >>> 0;

  // Handle bitFlip fault on base block
  const bitFlip = params.faults.find((f) => f.kind === "bitFlip") as
    | { kind: "bitFlip"; index: number }
    | undefined;

  let flippedBitMsg: string | null = null;
  if (bitFlip && typeof bitFlip.index === "number") {
    const idx = Math.max(0, Math.min(31, Math.round(bitFlip.index)));
    const flipMask = (1 << (31 - idx)) >>> 0;
    const prevBaseNet = baseNetInt;
    baseNetInt = ((baseNetInt ^ flipMask) & baseMask) >>> 0;
    if (baseNetInt !== prevBaseNet) {
      flippedBitMsg = `Bit ${idx} flipped: base block relocated to ${intToIp(baseNetInt)}/${basePrefix}.`;
    }
  }

  const baseTotalAddresses = Math.pow(2, 32 - basePrefix);
  const baseBlockStr = `${intToIp(baseNetInt)}/${basePrefix}`;

  // Filter valid departments
  const rawDepts = params.departments && params.departments.length > 0
    ? params.departments
    : ADDRESS_DEFAULTS.vlsm.departments;

  // Sort largest-first
  const sortedDepts = [...rawDepts].sort((a, b) => b.hostsNeeded - a.hostsNeeded);

  const steps: AddrStep[] = [];
  const carved: CarvedSubnet[] = [];
  let currentPtr = baseNetInt;
  let overflowDept: { name: string; needed: number; blockSize: number; remaining: number } | null = null;

  // Initial full uncarved block
  const uncarvedBlock: AddrBlock = {
    id: "block-base",
    label: `Unallocated Pool (${baseTotalAddresses} addrs)`,
    startIp: intToIp(baseNetInt),
    endIp: intToIp(baseNetInt + baseTotalAddresses - 1),
    prefix: basePrefix,
    offsetPct: 0,
    widthPct: 100,
    color: "#6E8F82", // idle wire chalk
    usableHosts: Math.max(0, baseTotalAddresses - 2),
    state: "idle",
  };

  const initialSpaceBar: AddrSpaceBar = {
    baseBlock: baseBlockStr,
    blocks: [uncarvedBlock],
    totalAddresses: baseTotalAddresses,
  };

  steps.push({
    description: `Starting with base block ${baseBlockStr} (${baseTotalAddresses} total addresses). Under Variable Length Subnet Masking (VLSM), we carve subnets sized precisely to each department's need rather than using wasteful equal-sized blocks.`,
    codeLines: [1],
    message: { text: `Base pool: ${baseBlockStr} (${baseTotalAddresses} addresses)`, tone: "info" },
    spaceBar: initialSpaceBar,
    facts: [
      { label: "Base Network", value: baseBlockStr },
      { label: "Total Space", value: `${baseTotalAddresses} addresses` },
      { label: "Departments", value: String(sortedDepts.length) },
    ],
  });

  // Frame 2: Explain sorting largest-first
  const sortedSummary = sortedDepts
    .map((d) => `${d.name} (${d.hostsNeeded})`)
    .join(" → ");

  steps.push({
    description: `Departments sorted descending by host requirements: ${sortedSummary}. Why largest-first? Carving large subnets first keeps them naturally aligned to their power-of-two binary boundaries. Allocating small blocks first would leave fragmented gaps where subsequent large blocks cannot fit.`,
    codeLines: [1],
    message: { text: "Rule: Sort requirements largest-first to avoid fragmentation", tone: "info" },
    spaceBar: initialSpaceBar,
    facts: [
      { label: "Order", value: "Largest to smallest" },
      { label: "Alignment", value: "Natural binary boundary" },
      { label: "Fragmentation", value: "0% when sorted" },
    ],
    table: {
      title: "Sorted Requirements",
      columns: ["Department", "Hosts Needed", "Required Block"],
      rows: sortedDepts.map((d) => {
        const blk = nextPowerOfTwo(d.hostsNeeded + 2);
        const pfx = 32 - Math.round(Math.log2(blk));
        return {
          label: d.name,
          cells: [
            { text: d.name },
            { text: `${d.hostsNeeded} hosts` },
            { text: `/${pfx} (${blk} addrs)` },
          ],
        };
      }),
    },
  });

  // Carve each department
  for (let i = 0; i < sortedDepts.length; i++) {
    const dept = sortedDepts[i];
    const needed = Math.max(1, dept.hostsNeeded);
    const totalRequired = needed + 2; // +2 for network & broadcast
    const blockSize = nextPowerOfTwo(totalRequired);
    const hostBits = Math.round(Math.log2(blockSize));
    const prefix = 32 - hostBits;
    const remaining = (baseNetInt + baseTotalAddresses) - currentPtr;

    if (blockSize > remaining) {
      overflowDept = {
        name: dept.name,
        needed,
        blockSize,
        remaining,
      };
      break;
    }

    const startInt = currentPtr;
    const endInt = startInt + blockSize - 1;
    const netIp = intToIp(startInt);
    const bcastIp = intToIp(endInt);
    const firstHost = intToIp(startInt + 1);
    const lastHost = intToIp(endInt - 1);
    const usableHosts = blockSize - 2;
    const hostsWasted = usableHosts - needed;
    const color = CHALK_SERIES[i % CHALK_SERIES.length];

    carved.push({
      deptId: dept.id,
      name: dept.name,
      hostsNeeded: needed,
      blockSize,
      prefix,
      startInt,
      endInt,
      netIp,
      bcastIp,
      firstHost,
      lastHost,
      usableHosts,
      hostsWasted,
      color,
    });

    currentPtr += blockSize;

    // Build space bar snapshot
    const blocks: AddrBlock[] = carved.map((c, idx) => ({
      id: `block-${c.deptId}`,
      label: `${c.name} (/${c.prefix})`,
      startIp: c.netIp,
      endIp: c.bcastIp,
      prefix: c.prefix,
      offsetPct: ((c.startInt - baseNetInt) / baseTotalAddresses) * 100,
      widthPct: (c.blockSize / baseTotalAddresses) * 100,
      color: c.color,
      usableHosts: c.usableHosts,
      hostsNeeded: c.hostsNeeded,
      hostsWasted: c.hostsWasted,
      state: idx === carved.length - 1 ? "new" : "visited",
    }));

    // Add remaining free block if any
    const freeStart = currentPtr;
    const freeEnd = baseNetInt + baseTotalAddresses - 1;
    const freeCount = (freeEnd - freeStart + 1);
    if (freeCount > 0) {
      blocks.push({
        id: "block-free-space",
        label: `Free Pool (${freeCount} addrs)`,
        startIp: intToIp(freeStart),
        endIp: intToIp(freeEnd),
        prefix: basePrefix,
        offsetPct: ((freeStart - baseNetInt) / baseTotalAddresses) * 100,
        widthPct: (freeCount / baseTotalAddresses) * 100,
        color: "#3E5B4E",
        usableHosts: Math.max(0, freeCount - 2),
        state: "idle",
      });
    }

    steps.push({
      description: `${dept.name} needs ${needed} hosts. Adding 2 for network & broadcast requires ${totalRequired} addresses. Smallest power of 2 is ${blockSize} (2^${hostBits}), giving prefix /${prefix}. Carved: ${netIp}/${prefix} (${usableHosts} usable, ${hostsWasted} wasted).`,
      codeLines: [2, 3, 4, 6, 7],
      message: { text: `Carved ${dept.name}: ${netIp}/${prefix} (${blockSize} addrs)`, tone: "ok" },
      spaceBar: {
        baseBlock: baseBlockStr,
        blocks,
        totalAddresses: baseTotalAddresses,
      },
      facts: [
        { label: "Department", value: dept.name },
        { label: "Subnet", value: `${netIp}/${prefix}` },
        { label: "Host Range", value: `${firstHost} – ${lastHost}` },
        { label: "Broadcast", value: bcastIp },
        { label: "Efficiency", value: `${needed}/${usableHosts} usable hosts` },
      ],
    });
  }

  // Handle Overflow Failure if requirements exceeded base block
  if (overflowDept) {
    const blocks: AddrBlock[] = carved.map((c) => ({
      id: `block-${c.deptId}`,
      label: `${c.name} (/${c.prefix})`,
      startIp: c.netIp,
      endIp: c.bcastIp,
      prefix: c.prefix,
      offsetPct: ((c.startInt - baseNetInt) / baseTotalAddresses) * 100,
      widthPct: (c.blockSize / baseTotalAddresses) * 100,
      color: c.color,
      usableHosts: c.usableHosts,
      hostsNeeded: c.hostsNeeded,
      hostsWasted: c.hostsWasted,
      state: "visited",
    }));

    // Add overflow marker
    const remOffset = ((currentPtr - baseNetInt) / baseTotalAddresses) * 100;
    const remWidth = 100 - remOffset;
    blocks.push({
      id: "block-overflow",
      label: `FAILED: ${overflowDept.name} (needs ${overflowDept.blockSize})`,
      startIp: intToIp(currentPtr),
      endIp: intToIp(baseNetInt + baseTotalAddresses - 1),
      prefix: 32,
      offsetPct: remOffset,
      widthPct: remWidth,
      color: "#E39AA6", // coral
      usableHosts: 0,
      hostsNeeded: overflowDept.needed,
      state: "failed",
    });

    steps.push({
      description: `Allocation halted: '${overflowDept.name}' requires ${overflowDept.needed} hosts (block of ${overflowDept.blockSize} addresses), but only ${overflowDept.remaining} addresses remain in base pool ${baseBlockStr}. Expand the base block prefix or reduce host requirements.`,
      codeLines: [5],
      message: {
        text: `Address space exhausted: '${overflowDept.name}' does not fit in ${baseBlockStr}`,
        tone: "error",
      },
      spaceBar: {
        baseBlock: baseBlockStr,
        blocks,
        totalAddresses: baseTotalAddresses,
      },
      facts: [
        { label: "Status", value: "FAILED (Overflow)", tone: "coral" },
        { label: "Failed Dept", value: overflowDept.name },
        { label: "Required Size", value: `${overflowDept.blockSize} addresses` },
        { label: "Space Remaining", value: `${overflowDept.remaining} addresses` },
      ],
    });

    return {
      steps,
      title: "VLSM Subnet Allocation: Out of Addresses",
      pseudocode: VLSM_PSEUDOCODE,
      stats: [
        { label: "Base block", value: baseBlockStr },
        { label: "Status", value: "Overflow", tone: "coral" },
        { label: "Failed dept", value: overflowDept.name },
      ],
    };
  }

  // Free Space Summary Frame
  const finalFreeStart = currentPtr;
  const finalFreeEnd = baseNetInt + baseTotalAddresses - 1;
  const finalFreeCount = Math.max(0, finalFreeEnd - finalFreeStart + 1);

  const finalBlocks: AddrBlock[] = carved.map((c) => ({
    id: `block-${c.deptId}`,
    label: `${c.name} (/${c.prefix})`,
    startIp: c.netIp,
    endIp: c.bcastIp,
    prefix: c.prefix,
    offsetPct: ((c.startInt - baseNetInt) / baseTotalAddresses) * 100,
    widthPct: (c.blockSize / baseTotalAddresses) * 100,
    color: c.color,
    usableHosts: c.usableHosts,
    hostsNeeded: c.hostsNeeded,
    hostsWasted: c.hostsWasted,
    state: "found",
  }));

  if (finalFreeCount > 0) {
    finalBlocks.push({
      id: "block-free-space",
      label: `Free Pool (${finalFreeCount} addrs)`,
      startIp: intToIp(finalFreeStart),
      endIp: intToIp(finalFreeEnd),
      prefix: basePrefix,
      offsetPct: ((finalFreeStart - baseNetInt) / baseTotalAddresses) * 100,
      widthPct: (finalFreeCount / baseTotalAddresses) * 100,
      color: "#2C5A47",
      usableHosts: Math.max(0, finalFreeCount - 2),
      state: "idle",
    });
  }

  const totalAllocatedAddresses = carved.reduce((sum, c) => sum + c.blockSize, 0);
  const totalHostsNeeded = carved.reduce((sum, c) => sum + c.hostsNeeded, 0);
  const totalUsableAllocated = carved.reduce((sum, c) => sum + c.usableHosts, 0);
  const totalWasted = carved.reduce((sum, c) => sum + c.hostsWasted, 0);

  const summaryTable: DataTable = {
    title: "VLSM Subnet Allocation Table",
    columns: ["Department", "Needed", "Allocated", "Prefix", "Network", "Broadcast", "Usable Range"],
    rows: carved.map((c) => ({
      label: c.name,
      cells: [
        { text: c.name },
        { text: `${c.hostsNeeded}` },
        { text: `${c.usableHosts}` },
        { text: `/${c.prefix}` },
        { text: c.netIp },
        { text: c.bcastIp },
        { text: `${c.firstHost}–${c.lastHost}` },
      ],
    })),
  };

  steps.push({
    description: `All departments successfully allocated with contiguous boundaries. A pool of ${finalFreeCount} unassigned addresses (${intToIp(finalFreeStart)} – ${intToIp(finalFreeEnd)}) remains completely unfragmented and ready for future growth.`,
    codeLines: [8],
    message: { text: `All ${carved.length} departments allocated · ${finalFreeCount} addresses free`, tone: "ok" },
    spaceBar: {
      baseBlock: baseBlockStr,
      blocks: finalBlocks,
      totalAddresses: baseTotalAddresses,
    },
    facts: [
      { label: "Allocated", value: `${totalAllocatedAddresses} / ${baseTotalAddresses}` },
      { label: "Hosts Satisfied", value: `${totalHostsNeeded} hosts` },
      { label: "Free Space", value: `${finalFreeCount} addresses`, tone: "mint" },
      { label: "Internal Waste", value: `${totalWasted} addresses` },
    ],
    table: summaryTable,
  });

  // Frame: VLSM vs FLSM comparison
  // Compute what FLSM would require:
  // FLSM must size all subnets to match the largest requirement.
  const largestDept = sortedDepts[0];
  const flsmBlockSize = nextPowerOfTwo(largestDept.hostsNeeded + 2);
  const flsmTotalAddresses = flsmBlockSize * sortedDepts.length;
  const flsmPrefix = 32 - Math.round(Math.log2(flsmBlockSize));
  const flsmFits = flsmTotalAddresses <= baseTotalAddresses;

  const comparisonBlocks: AddrBlock[] = [];
  if (flsmFits) {
    for (let i = 0; i < sortedDepts.length; i++) {
      const d = sortedDepts[i];
      const start = baseNetInt + i * flsmBlockSize;
      const end = start + flsmBlockSize - 1;
      comparisonBlocks.push({
        id: `flsm-${d.id}`,
        label: `${d.name} (FLSM /${flsmPrefix})`,
        startIp: intToIp(start),
        endIp: intToIp(end),
        prefix: flsmPrefix,
        offsetPct: ((start - baseNetInt) / baseTotalAddresses) * 100,
        widthPct: (flsmBlockSize / baseTotalAddresses) * 100,
        color: CHALK_SERIES[i % CHALK_SERIES.length],
        usableHosts: flsmBlockSize - 2,
        hostsNeeded: d.hostsNeeded,
        hostsWasted: (flsmBlockSize - 2) - d.hostsNeeded,
        state: "visited",
      });
    }
  } else {
    // Show truncated / overflowing FLSM representation
    for (let i = 0; i < sortedDepts.length; i++) {
      const d = sortedDepts[i];
      const start = baseNetInt + i * flsmBlockSize;
      if (start < baseNetInt + baseTotalAddresses) {
        const width = Math.min(flsmBlockSize, (baseNetInt + baseTotalAddresses) - start);
        comparisonBlocks.push({
          id: `flsm-${d.id}`,
          label: `${d.name} (/${flsmPrefix})`,
          startIp: intToIp(start),
          endIp: intToIp(start + width - 1),
          prefix: flsmPrefix,
          offsetPct: ((start - baseNetInt) / baseTotalAddresses) * 100,
          widthPct: (width / baseTotalAddresses) * 100,
          color: CHALK_SERIES[i % CHALK_SERIES.length],
          usableHosts: flsmBlockSize - 2,
          hostsNeeded: d.hostsNeeded,
          state: "visited",
        });
      }
    }
  }

  const savedAddresses = flsmTotalAddresses - totalAllocatedAddresses;
  const flsmVerdict = flsmFits
    ? `Under fixed-length FLSM, every subnet would be forced to /${flsmPrefix} (${flsmBlockSize} addresses) to satisfy ${largestDept.name}. That would consume ${flsmTotalAddresses} addresses. VLSM consumed only ${totalAllocatedAddresses} addresses — saving ${savedAddresses} IP addresses (${Math.round((savedAddresses / flsmTotalAddresses) * 100)}% savings).`
    : `Under fixed-length FLSM, sizing all ${sortedDepts.length} departments to match ${largestDept.name}'s requirement (${flsmBlockSize} addresses per subnet) would demand ${flsmTotalAddresses} addresses — exceeding the base block ${baseBlockStr}! FLSM would fail to provision all departments; VLSM easily fits all four with room to spare.`;

  steps.push({
    description: flsmVerdict,
    codeLines: [9],
    message: {
      text: flsmFits
        ? `VLSM saved ${savedAddresses} addresses compared to FLSM`
        : `FLSM fails (${flsmTotalAddresses} addrs needed) — VLSM succeeds (${totalAllocatedAddresses} used)`,
      tone: "ok",
    },
    spaceBar: {
      title: "VLSM Variable Allocation",
      baseBlock: baseBlockStr,
      blocks: finalBlocks,
      totalAddresses: baseTotalAddresses,
    },
    comparisonBar: {
      title: `FLSM Fixed-Length Allocation (forced /${flsmPrefix} for all)`,
      baseBlock: baseBlockStr,
      blocks: comparisonBlocks,
      totalAddresses: baseTotalAddresses,
    },
    facts: [
      { label: "VLSM Addresses Used", value: `${totalAllocatedAddresses}`, tone: "mint" },
      { label: "FLSM Requirement", value: `${flsmTotalAddresses} (${flsmFits ? "Fits" : "Exceeds /24"})`, tone: flsmFits ? "amber" : "coral" },
      { label: "Address Savings", value: `${Math.max(0, savedAddresses)} addresses`, tone: "mint" },
      { label: "Free Space Remaining", value: `${finalFreeCount} addresses` },
    ],
    table: summaryTable,
  });

  // Frame: Fault note if bitFlip changed the base block
  if (flippedBitMsg) {
    steps.push({
      description: `${flippedBitMsg} Every derived department subnet shifts proportionally to the new base network while preserving individual block sizes and relative offsets.`,
      codeLines: [1],
      message: { text: flippedBitMsg, tone: "warn" },
      spaceBar: {
        baseBlock: baseBlockStr,
        blocks: finalBlocks,
        totalAddresses: baseTotalAddresses,
      },
      facts: [
        { label: "Fault", value: "Bit Flip on Base Block", tone: "coral" },
        { label: "New Base Block", value: baseBlockStr, tone: "coral" },
        { label: "Department Offsets", value: "Preserved" },
      ],
    });
  }

  const stats = [
    { label: "Base block", value: baseBlockStr },
    { label: "Usable hosts", value: `${totalHostsNeeded} / ${totalUsableAllocated}`, tone: "mint" as const },
    { label: "Free space", value: `${finalFreeCount} addrs`, tone: "signal" as const },
    { label: "Wasted", value: `${totalWasted}`, tone: (totalWasted > 30 ? "amber" : "mint") as "amber" | "mint" },
  ];

  return {
    steps,
    title: "VLSM: Variable-Length Subnet Masking",
    pseudocode: VLSM_PSEUDOCODE,
    stats,
  };
}

// --- Main Engine Dispatcher -------------------------------------------------

export function runAddressOperation(params: AddressRunParams): AddrProgram {
  switch (params.op) {
    case "ipv4Addressing":
      return runIpv4Addressing(params);
    case "vlsm":
      return runVlsm(params);
  }
}
