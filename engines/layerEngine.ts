// ---------------------------------------------------------------------------
// layerEngine — the OSI stack as lanes, with one PDU descending and climbing.
//
// The flagship animation of Unit 1: a message walks down seven layers gaining a
// header at each, crosses the wire as raw bits, then climbs the receiver's seven
// layers shedding them again.
//
// The message and the addressing are the student's. Type your own text and the
// bits on the wire are its real ASCII; type your own IPs and ports and they
// appear in the headers that carry them. Overhead, padding and frame size are
// all recomputed from what you actually sent — which is how you discover that
// five characters leave the machine as a 64-byte frame.
// ---------------------------------------------------------------------------

import type { LayerLane, LayerProgram, LayerStep, PduHeader, Prediction } from "@/types/visualization";
import { LAYER_FACTS } from "./layerFacts.ts";

export interface LayerRunParams {
  message: string;
  srcIp: string;
  dstIp: string;
  srcPort: number;
  dstPort: number;
}

export const LAYER_DEFAULTS: LayerRunParams = {
  message: "HELLO",
  srcIp: "10.0.0.5",
  dstIp: "10.0.0.9",
  srcPort: 51032,
  dstPort: 80,
};

/** Real header sizes, in bytes — the numbers the overhead stat is built from. */
const TCP_B = 20;
const IP_B = 20;
const ETH_HDR_B = 14;
const FCS_B = 4;
const OVERHEAD_B = TCP_B + IP_B + ETH_HDR_B + FCS_B;
/** Ethernet will not put a frame smaller than this on the wire. */
const MIN_FRAME_B = 64;

const LANES: Omit<LayerLane, "state">[] = [
  { n: 7, name: "Application", role: "gives the app a way to ask the network for something", pduName: "Data" },
  { n: 6, name: "Presentation", role: "translates: character encoding, compression, encryption", pduName: "Data" },
  { n: 5, name: "Session", role: "opens, maintains and closes the conversation", pduName: "Data" },
  { n: 4, name: "Transport", role: "splits into segments; adds ports and sequence numbers", pduName: "Segment" },
  { n: 3, name: "Network", role: "adds logical (IP) addresses and chooses a route", pduName: "Packet" },
  { n: 2, name: "Data Link", role: "frames it for the next physical hop; adds MAC and a checksum", pduName: "Frame" },
  { n: 1, name: "Physical", role: "turns the bits into voltage, light or radio on the medium", pduName: "Bits" },
];

/** Header each layer clamps on, with the student's own values written into it. */
function headersFor(p: LayerRunParams): Record<number, PduHeader> {
  return {
    7: {
      id: "AH",
      label: "AH",
      tone: "violet",
      note: "Application header — in the real TCP/IP stack layers 5–7 are one layer and add no separate header. OSI models them separately.",
    },
    6: {
      id: "PH",
      label: "PH",
      tone: "violet",
      note: "Presentation header — character set, compression and encryption details.",
    },
    5: { id: "SH", label: "SH", tone: "violet", note: "Session header — which conversation this belongs to." },
    4: {
      id: "TCP",
      label: "TCP",
      tone: "amber",
      note: `Source port ${p.srcPort} → destination port ${p.dstPort}, plus sequence number, ACK number, flags and window. ${TCP_B} bytes.`,
    },
    3: {
      id: "IP",
      label: "IP",
      tone: "signal",
      note: `${p.srcIp} → ${p.dstIp}, TTL 64, protocol TCP. ${IP_B} bytes — this is the only header routers read.`,
    },
    2: {
      id: "MAC",
      label: "MAC",
      tone: "mint",
      note: `Destination MAC, source MAC, EtherType. ${ETH_HDR_B} bytes — and rewritten at every single hop, unlike the IP header above it.`,
    },
  };
}

const FCS: PduHeader = {
  id: "FCS",
  label: "FCS",
  tone: "mint",
  note: `Frame Check Sequence — a ${FCS_B}-byte CRC over the whole frame, so the receiver can tell if a bit flipped in transit.`,
};

const CODE = [
  "SENDER — encapsulate, top down",
  "  data  <- your message",
  "  for layer = 7 down to 2:",
  "      data <- header(layer) + data",
  "  frame <- data + FCS",
  "  pad frame to 64 bytes if short",
  "  bits  <- serialize(frame)",
  "  transmit(bits)",
  "",
  "RECEIVER — decapsulate, bottom up",
  "  frame <- deserialize(bits)",
  "  verify FCS",
  "  for layer = 2 up to 7:",
  "      strip header(layer)",
  "  deliver the message",
];

/** Real ASCII bits, because a fake bit string teaches the wrong thing. */
function toBits(s: string): string {
  return s
    .split("")
    .map((c) => c.charCodeAt(0).toString(2).padStart(8, "0"))
    .join(" ");
}

const PREAMBLE = "10101010 ".repeat(3) + "10101011";

/**
 * A Predict-mode question with the right answer placed at `slot` among the
 * wrong ones — deterministic, so the same lesson asks the same way every
 * time, but the answer is not always option 1.
 */
function ask(question: string, right: string, wrong: string[], why: string, slot: number): Prediction {
  const options = wrong.filter((w) => w !== right).slice(0, 3);
  const at = slot % (options.length + 1);
  options.splice(at, 0, right);
  return { question, options, answer: at, why };
}

function lanes(activeN: number, side: "sender" | "wire" | "receiver"): LayerLane[] {
  return LANES.map((l) => {
    let state: LayerLane["state"] = "idle";
    if (l.n === activeN) state = "active";
    else if (side === "sender" && l.n > activeN) state = "done";
    else if (side === "receiver" && l.n < activeN) state = "done";
    else if (side === "wire") state = l.n === 1 ? "active" : "done";
    return { ...l, state };
  });
}

function encapsulation(p: LayerRunParams): LayerProgram {
  const message = p.message.slice(0, 40) || "HELLO";
  const HEADERS = headersFor(p);
  const bytes = message.length;
  const framed = bytes + OVERHEAD_B;
  const onWire = Math.max(MIN_FRAME_B, framed);
  const padding = onWire - framed;
  const wireBits = `${PREAMBLE} … ${toBits(message.slice(0, 8))} …`;

  const steps: LayerStep[] = [];
  const stack: PduHeader[] = []; // outermost first

  const SENDER_ASK: Record<number, Prediction | undefined> = {
    4: ask(
      "Layer 4 is about to wrap the data. What is the result called?",
      "A segment",
      ["A packet", "A frame", "Bits"],
      "Transport splits data into segments and stamps them with ports.",
      1,
    ),
    3: ask(
      "Which header does Layer 3 put on?",
      "IP: source and destination addresses",
      ["TCP: ports and sequence numbers", "Ethernet: MAC addresses", "FCS: a checksum"],
      "The Network layer adds logical (IP) addresses so routers can forward it.",
      2,
    ),
    2: ask(
      "Layer 2 adds a header on the front. What does it add on the back?",
      "An FCS checksum",
      ["The destination IP", "The port number", "Nothing"],
      "The trailer is a CRC over the whole frame so the receiver can spot flipped bits.",
      0,
    ),
  };

  const push = (s: Omit<LayerStep, "lanes">) =>
    steps.push({ ...s, lanes: lanes(s.at, s.side) } as LayerStep);

  // --- sender: down the stack ---
  push({
    at: 7,
    side: "sender",
    headers: [],
    payload: message,
    description: `You type "${message}" and hit send. ${bytes} character${bytes === 1 ? "" : "s"} — ${bytes} byte${bytes === 1 ? "" : "s"}. Right now it is just data, and it knows nothing about networks, addresses or cables.`,
    codeLines: [1, 2],
    label: "send",
  });

  for (const n of [7, 6, 5, 4, 3, 2]) {
    const h = HEADERS[n];
    stack.unshift(h);
    const lane = LANES.find((l) => l.n === n)!;
    push({
      at: n,
      side: "sender",
      label: `L${n}↓`,
      predict: SENDER_ASK[n],
      headers: [...stack],
      payload: message,
      trailer: n === 2 ? FCS : undefined,
      addedId: h.id,
      description: `Layer ${n} — ${lane.name}. ${h.note} ${lane.pduName === "Data" ? "It is still just data to the layers below." : `The data is now called a ${lane.pduName.toLowerCase()}.`}`,
      codeLines: n === 2 ? [3, 4, 5] : [3, 4],
      message:
        n === 2
          ? { text: "Frame complete — headers on the front, FCS on the back", tone: "info" }
          : undefined,
    });
  }

  if (padding > 0) {
    push({
      at: 2,
      side: "sender",
      headers: [...stack],
      payload: message,
      trailer: FCS,
      label: "pad",
      predict: ask(
        `Your frame is ${framed} bytes. Ethernet's minimum is ${MIN_FRAME_B}. What happens?`,
        `It is padded up to ${MIN_FRAME_B} bytes`,
        ["It is rejected", "It is sent as it is", "It waits for more data"],
        "A frame under 64 bytes could finish before a collision is even detected, so Ethernet pads it.",
        3,
      ),
      description: `The frame is only ${framed} bytes and Ethernet will not transmit anything under ${MIN_FRAME_B}. ${padding} byte${padding === 1 ? "" : "s"} of padding get${padding === 1 ? "s" : ""} added — bytes that carry nothing at all, purely so collision detection works on the wire.`,
      codeLines: [6],
      message: { text: `${padding} byte${padding === 1 ? "" : "s"} of padding added`, tone: "warn" },
    });
  }

  push({
    at: 1,
    side: "sender",
    headers: [...stack],
    payload: message,
    trailer: FCS,
    bits: wireBits,
    label: "L1↓",
    description:
      "Layer 1 — Physical. The frame stops being a structure and becomes a signal: 1s and 0s as voltage on copper, pulses of light in fibre, or a modulated radio wave. Nothing on the cable knows what a header is.",
    codeLines: [7, 8],
  });

  push({
    at: 0,
    side: "wire",
    label: "wire",
    predict: ask(
      `You sent ${bytes} byte${bytes === 1 ? "" : "s"}. How many bytes actually go on the wire?`,
      `${onWire} bytes`,
      [`${bytes} bytes`, `${framed} bytes`, `${bytes + OVERHEAD_B + 40} bytes`, "1500 bytes"],
      `Payload + ${OVERHEAD_B} bytes of headers${padding > 0 ? ` + ${padding} of padding` : ""} = ${onWire}.`,
      1,
    ),
    headers: [...stack],
    payload: message,
    trailer: FCS,
    bits: wireBits,
    description: `On the wire. ${bytes} byte${bytes === 1 ? "" : "s"} of your data travelling inside a ${onWire}-byte frame — ${Math.round((onWire / bytes) * 10) / 10}× its own size. Overhead is the price of every layer doing exactly one job.`,
    codeLines: [8],
    message: { text: `${bytes} B payload · ${onWire - bytes} B of everything else`, tone: "warn" },
  });

  // --- receiver: up the stack ---
  push({
    at: 1,
    side: "receiver",
    headers: [...stack],
    payload: message,
    trailer: FCS,
    bits: wireBits,
    label: "L1↑",
    description:
      "The receiver's Layer 1 samples the signal back into bits. It has no idea what they mean — it just hands them up.",
    codeLines: [11],
  });

  push({
    at: 2,
    side: "receiver",
    headers: [...stack],
    payload: message,
    trailer: FCS,
    label: "FCS✓",
    predict: ask(
      "The frame has arrived. What does the receiver check before anything else?",
      "The FCS: did any bit flip?",
      ["The destination IP", "The destination port", "The message text"],
      "Nothing inside a corrupted frame can be trusted, so the checksum comes first.",
      2,
    ),
    description:
      "Layer 2 recomputes the CRC and compares it against the FCS. They match, so nothing was corrupted in transit — and only now is it safe to look at what is inside.",
    codeLines: [12],
    message: { text: "FCS verified — frame intact", tone: "ok" },
  });

  for (const n of [2, 3, 4, 5, 6, 7]) {
    const h = HEADERS[n];
    const idx = stack.findIndex((x) => x.id === h.id);
    if (idx >= 0) stack.splice(idx, 1);
    const lane = LANES.find((l) => l.n === n)!;
    const detail =
      n === 3
        ? ` It confirms the packet really was addressed to ${p.dstIp}.`
        : n === 4
          ? ` Port ${p.dstPort} is what tells it which application gets this data.`
          : "";
    push({
      at: n,
      side: "receiver",
      label: `L${n}↑`,
      predict:
        n === 4
          ? ask(
              "TCP is about to hand the data up. What tells it which application gets it?",
              `Destination port ${p.dstPort}`,
              [`Destination IP ${p.dstIp}`, "Destination MAC address", "The sequence number"],
              "Ports identify the process; IP only got it to the right machine.",
              0,
            )
          : undefined,
      headers: [...stack],
      payload: message,
      removedId: h.id,
      description: `Layer ${n} — ${lane.name} reads its own header, acts on it, then strips it and passes the rest up.${detail}`,
      codeLines: [13, 14],
    });
  }

  push({
    at: 7,
    side: "receiver",
    headers: [],
    payload: message,
    label: "done",
    description: `"${message}" arrives — byte for byte what was sent. Every header added has been removed by the layer that added it. That mirror symmetry is the entire idea of a layered model.`,
    codeLines: [15],
    message: { text: `"${message}" delivered intact`, tone: "ok" },
  });

  return {
    steps,
    title: `OSI Encapsulation — "${message}", end to end`,
    pseudocode: CODE,
    stats: [
      { label: "Layers", value: "7", tone: "signal" },
      { label: "Payload", value: `${bytes} B`, tone: "mint" },
      { label: "Headers", value: `${OVERHEAD_B} B`, tone: "amber" },
      ...(padding > 0 ? [{ label: "Padding", value: `${padding} B`, tone: "amber" as const }] : []),
      { label: "On the wire", value: `${onWire} B`, tone: "coral" },
    ],
  };
}

// --- operation: OSI 7-Layer Reference Model --------------------------------

const OSI_CODE = [
  "7. Application: User interface, network APIs (HTTP, DNS, FTP)",
  "6. Presentation: Encryption (TLS), Data compression, Format translation",
  "5. Session: Dialog coordination, checkpoint recovery, session tokens",
  "4. Transport: End-to-end segmentation, Flow control (TCP/UDP, Ports)",
  "3. Network: Logical addressing, Packet routing across subnets (IP)",
  "2. Data Link: Physical hop framing, MAC addressing, Error detection (CRC)",
  "1. Physical: Raw bitstream transmission over copper, fiber or wireless",
];

function osiModel(p: LayerRunParams): LayerProgram {
  const steps: LayerStep[] = [];
  const message = p.message || "HELLO";
  const HEADERS = headersFor(p);

  // Step 0: Overview
  steps.push({
    lanes: LANES.map((l) => ({ ...l, state: "idle" })),
    at: 7,
    side: "sender",
    label: "overview",
    headers: [],
    payload: message,
    description:
      "The OSI model splits networking into seven layers, each with one job and a clean hand-off to the next. Any vendor's layer can talk to any other's as long as both follow that layer's rules. Click any layer to inspect it.",
    codeLines: [1, 2, 3, 4, 5, 6, 7],
  });

  const OSI_ASK: Record<number, Prediction> = {
    7: ask("Which of these runs at Layer 7?", "HTTP", ["TCP", "IP", "Ethernet"], "HTTP is what your browser speaks.", 1),
    6: ask(
      "Which job belongs to Layer 6?",
      "Encryption and character encoding",
      ["Choosing a route", "Adding MAC addresses", "Numbering segments"],
      "Presentation is the translator: format, compression, encryption.",
      2,
    ),
    5: ask(
      "What does the Session layer manage?",
      "Opening and closing the conversation",
      ["IP addresses", "Voltage levels", "The CRC"],
      "Dialog control: who talks, checkpoints, and a clean close.",
      0,
    ),
    4: ask("What does Layer 4 call its data?", "Segment", ["Packet", "Frame", "Bits"], "Transport makes segments.", 3),
    3: ask("Which device works at Layer 3?", "Router", ["Switch", "Hub", "Repeater"], "Routers read IP addresses.", 1),
    2: ask(
      "Which address does Layer 2 use?",
      "MAC address",
      ["IP address", "Port number", "URL"],
      "MAC addresses deliver a frame across one hop.",
      2,
    ),
    1: ask("What does Layer 1 call its data?", "Bits", ["Frame", "Packet", "Segment"], "Physical just moves bits.", 0),
  };

  // Layer-by-layer tour
  for (const lane of LANES) {
    const n = lane.n;
    const h = HEADERS[n];
    const fact = LAYER_FACTS[lane.name];
    const pduWord = lane.pduName === "Data" ? "data" : lane.pduName === "Bits" ? "bits" : `a ${lane.pduName.toLowerCase()}`;
    steps.push({
      lanes: LANES.map((l) => ({ ...l, state: l.n === n ? "active" : l.n > n ? "done" : "idle" })),
      at: n,
      side: "sender",
      label: `L${n}`,
      predict: OSI_ASK[n],
      headers: h ? [h] : [],
      payload: message,
      bits: n === 1 ? toBits(message.slice(0, 8)) : undefined,
      description: `Layer ${n}, ${lane.name}: ${fact.job} Its data is called ${pduWord}. You meet ${fact.protocols.slice(0, 3).join(", ")} here, on ${fact.devices.slice(0, 2).join(" and ").toLowerCase()}.`,
      codeLines: [8 - n],
      message: { text: `Layer ${n}: ${lane.name} (${lane.pduName})`, tone: "info" },
    });
  }

  return {
    steps,
    title: "OSI 7-Layer Reference Architecture",
    pseudocode: OSI_CODE,
    stats: [
      { label: "Standard", value: "ISO/IEC 7498-1", tone: "signal" },
      { label: "Layers", value: "7 Layers", tone: "mint" },
      { label: "Model Type", value: "Theoretical Reference", tone: "amber" },
      { label: "PDUs", value: "Data → Seg → Pkt → Frame → Bits", tone: "signal" },
    ],
  };
}

// --- operation: TCP/IP 4-Layer Architecture --------------------------------

const TCPIP_CODE = [
  "4. Application (OSI 7,6,5): HTTP, DNS, SSH, TLS, SMTP",
  "3. Transport   (OSI 4):     TCP (Reliable, Ports) / UDP (Datagram)",
  "2. Internet    (OSI 3):     IPv4, IPv6, ICMP, Routing",
  "1. Network Access (OSI 2,1): Ethernet, Wi-Fi, Fiber, Physical NIC",
];

const TCPIP_LANES: Omit<LayerLane, "state">[] = [
  { n: 4, name: "Application", role: "combines user protocols, formatting, encryption & session state (OSI 7, 6, 5)", pduName: "Data / Message" },
  { n: 3, name: "Transport", role: "manages host-to-host streams, port multiplexing and congestion (OSI 4)", pduName: "Segment (TCP) / Datagram (UDP)" },
  { n: 2, name: "Internet", role: "routes packets across independent network boundaries using IP (OSI 3)", pduName: "IP Packet" },
  { n: 1, name: "Network Access", role: "delivers frames across physical hardware links and signals (OSI 2, 1)", pduName: "Frame / Bits" },
];

function tcpIpModel(p: LayerRunParams): LayerProgram {
  const steps: LayerStep[] = [];
  const message = p.message || "HELLO";
  const tcpHeader: PduHeader = { id: "TCP", label: "TCP", tone: "amber", note: `Port ${p.srcPort} → ${p.dstPort}` };
  const ipHeader: PduHeader = { id: "IP", label: "IP", tone: "signal", note: `${p.srcIp} → ${p.dstIp}` };
  const ethHeader: PduHeader = { id: "ETH", label: "ETH", tone: "mint", note: "MAC addressing + FCS" };

  steps.push({
    lanes: TCPIP_LANES.map((l) => ({ ...l, state: "idle" })),
    at: 4,
    side: "sender",
    headers: [],
    payload: message,
    label: "overview",
    description: "The TCP/IP model (DoD / DARPA Internet Architecture) is the practical 4-layer foundation of the modern Internet. Rather than rigid 7 layers, it collapses presentation/session into Application and physical/data link into Network Access.",
    codeLines: [1, 2, 3, 4],
  });

  // Step 4: Application
  steps.push({
    lanes: TCPIP_LANES.map((l) => ({ ...l, state: l.n === 4 ? "active" : "idle" })),
    at: 4,
    side: "sender",
    headers: [],
    payload: message,
    label: "App",
    description: "Layer 4 (Application): Handles application-level protocols like HTTP/3, DNS, and TLS directly in user space without separate presentation or session layers.",
    codeLines: [1],
  });

  // Step 3: Transport
  steps.push({
    lanes: TCPIP_LANES.map((l) => ({ ...l, state: l.n === 3 ? "active" : l.n > 3 ? "done" : "idle" })),
    at: 3,
    side: "sender",
    headers: [tcpHeader],
    addedId: "TCP",
    payload: message,
    label: "Transport",
    predict: ask(
      "Which header does the Transport layer add?",
      "TCP (or UDP)",
      ["IP", "Ethernet", "TLS"],
      "Transport is where ports live: TCP for reliable streams, UDP for datagrams.",
      2,
    ),
    description: `Layer 3 (Transport): TCP adds ports (${p.srcPort} → ${p.dstPort}), sequence numbers, flow control window, and checksums for reliable end-to-end delivery.`,
    codeLines: [2],
  });

  // Step 2: Internet
  steps.push({
    lanes: TCPIP_LANES.map((l) => ({ ...l, state: l.n === 2 ? "active" : l.n > 2 ? "done" : "idle" })),
    at: 2,
    side: "sender",
    headers: [ipHeader, tcpHeader],
    addedId: "IP",
    payload: message,
    label: "Internet",
    predict: ask(
      "The Internet layer lines up with which OSI layer?",
      "Layer 3, Network",
      ["Layer 2, Data Link", "Layer 4, Transport", "Layers 5 to 7"],
      "Same job: IP addressing and routing.",
      1,
    ),
    description: `Layer 2 (Internet): IP encapsulates the segment with logical addressing (${p.srcIp} → ${p.dstIp}) and TTL. This is the universal internetworking glue.`,
    codeLines: [3],
  });

  // Step 1: Network Access
  steps.push({
    lanes: TCPIP_LANES.map((l) => ({ ...l, state: l.n === 1 ? "active" : "done" })),
    at: 1,
    side: "sender",
    headers: [ethHeader, ipHeader, tcpHeader],
    payload: message,
    trailer: FCS,
    addedId: "ETH",
    bits: toBits(message.slice(0, 8)),
    label: "Net access",
    predict: ask(
      "Network Access covers which OSI layers?",
      "Layers 2 and 1",
      ["Layer 3 only", "Layers 4 and 3", "Layer 1 only"],
      "Framing, MAC addressing and the physical signal, all in one TCP/IP layer.",
      3,
    ),
    description: "Layer 1 (Network Access): Encompasses device drivers, Ethernet MAC framing, and physical transceiver serialization onto copper, glass or radio waves.",
    codeLines: [4],
    message: { text: "TCP/IP 4-Layer Stack complete · Ready for wire", tone: "ok" },
  });

  return {
    steps,
    title: "TCP/IP 4-Layer Internet Architecture",
    pseudocode: TCPIP_CODE,
    stats: [
      { label: "Architecture", value: "DARPA / IETF", tone: "signal" },
      { label: "Layers", value: "4 Layers", tone: "mint" },
      { label: "Model Type", value: "Practical Internet Standard", tone: "mint" },
      { label: "Core Protocol", value: "TCP/IP & UDP/IP", tone: "signal" },
    ],
  };
}

export type LayerOp = "osiModel" | "encapsulation" | "tcpIpModel";

export function runLayerOperation(op: LayerOp, p: LayerRunParams): LayerProgram {
  switch (op) {
    case "osiModel":
      return osiModel(p);
    case "tcpIpModel":
      return tcpIpModel(p);
    case "encapsulation":
    default:
      return encapsulation(p);
  }
}

