// ---------------------------------------------------------------------------
// addressFacts — Inspector cards for the address canvas: one bit (its place
// value, which side of the prefix it is on, and what flipping it would do to
// the network address), one octet (the sum that makes its decimal) and one
// carved block (range, usable hosts, waste).
// ---------------------------------------------------------------------------

import type { FactSpec } from "./lessonKit.ts";
import type { AddrBlock, AddrGridRow } from "../types/visualization.ts";

const toIp = (v: number) => [24, 16, 8, 0].map((s) => (v >>> s) & 255).join(".");
const rowInt = (row: AddrGridRow) => row.octets.reduce((acc, o) => ((acc << 8) | o.decimal) >>> 0, 0);
const mask = (p: number) => (p <= 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);

export function bitFact(row: AddrGridRow, idx: number): FactSpec {
  const octet = Math.floor(idx / 8);
  const bit = row.octets[octet].bits[idx % 8];
  const place = 128 >> idx % 8;
  const p = row.boundaryAfterBit;
  const v = rowInt(row);
  const flipped = (v ^ (1 << (31 - idx))) >>> 0;
  const rows: [string, string][] = [
    ["Bit", `${idx} of 0–31 (octet ${octet + 1})`],
    ["Value", String(bit.val)],
    ["Place value", `${place}${bit.val ? ` → adds ${place}` : " → adds 0"}`],
  ];
  if (p !== undefined) {
    const side = idx < p ? "network" : "host";
    rows.push(["Side of /" + p, side]);
    rows.push(["If it flipped", toIp(flipped)]);
    rows.push(["Network would be", `${toIp((flipped & mask(p)) >>> 0)} (now ${toIp((v & mask(p)) >>> 0)})`]);
  }
  return {
    lead:
      p === undefined
        ? `One of the 32 bits. In its octet it is worth ${place}.`
        : idx < p
          ? `A network bit. Every host on this subnet has exactly this bit — change it and you are talking about a different network.`
          : `A host bit. It picks out one machine inside the subnet; the router ignores it when choosing a route.`,
    rows,
    remember: "Network bits say which network; host bits say which machine on it.",
  };
}

export function octetFact(row: AddrGridRow, i: number): FactSpec {
  const o = row.octets[i];
  const used = o.bits.map((b, k) => (b.val ? 128 >> k : 0)).filter(Boolean);
  return {
    lead: `Octet ${i + 1} holds 8 bits, so it ranges 0–255. The dots in an IP address are just for humans.`,
    rows: [
      ["Decimal", String(o.decimal)],
      ["Binary", o.bits.map((b) => b.val).join("")],
      ["Sum", used.length ? `${used.join(" + ")} = ${o.decimal}` : "0"],
    ],
    remember: "Place values: 128 64 32 16 8 4 2 1.",
  };
}

export function blockFact(b: AddrBlock, total: number): FactSpec {
  const size = Math.round((b.widthPct / 100) * total);
  const free = b.id === "block-free-space";
  return {
    lead: free
      ? "Addresses not given to anyone yet. Because the big blocks were carved first, this space is still one contiguous run."
      : b.state === "failed"
        ? "This department's block would not fit in what is left."
        : `${b.label.replace(/ \(\/\d+\)$/, "")} gets ${b.startIp}/${b.prefix}.`,
    rows: [
      ["Range", `${b.startIp} – ${b.endIp}`],
      ["Addresses", size.toLocaleString("en-US")],
      ...(!free && b.state !== "failed" ? ([["Prefix", `/${b.prefix}`], ["Usable hosts", String(b.usableHosts)]] as [string, string][]) : []),
      ...(b.hostsNeeded !== undefined ? ([["Asked for", String(b.hostsNeeded)]] as [string, string][]) : []),
      ...(b.hostsWasted !== undefined ? ([["Unused", String(b.hostsWasted)]] as [string, string][]) : []),
      ["Share of base", `${b.widthPct.toFixed(1)}%`],
    ],
    remember: "Block size is always a power of two, and a block always starts on a multiple of its own size.",
  };
}
