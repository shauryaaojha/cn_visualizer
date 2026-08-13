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

import type { LayerLane, LayerProgram, LayerStep, PduHeader } from "@/types/visualization";

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
  });

  for (const n of [7, 6, 5, 4, 3, 2]) {
    const h = HEADERS[n];
    stack.unshift(h);
    const lane = LANES.find((l) => l.n === n)!;
    push({
      at: n,
      side: "sender",
      headers: [...stack],
      payload: message,
      trailer: n === 2 ? FCS : undefined,
      addedId: h.id,
      description: `Layer ${n} — ${lane.name}. ${h.note} The data is now called a ${lane.pduName.toLowerCase()}.`,
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
      description: `The frame is only ${framed} bytes and Ethernet will not transmit anything under ${MIN_FRAME_B}. ${padding} bytes of padding get added — bytes that carry nothing at all, purely so collision detection works on the wire.`,
      codeLines: [6],
      message: { text: `${padding} bytes of padding added`, tone: "warn" },
    });
  }

  push({
    at: 1,
    side: "sender",
    headers: [...stack],
    payload: message,
    trailer: FCS,
    bits: wireBits,
    description:
      "Layer 1 — Physical. The frame stops being a structure and becomes a signal: 1s and 0s as voltage on copper, pulses of light in fibre, or a modulated radio wave. Nothing on the cable knows what a header is.",
    codeLines: [7, 8],
  });

  push({
    at: 0,
    side: "wire",
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

export type LayerOp = "encapsulation";

export function runLayerOperation(op: LayerOp, p: LayerRunParams): LayerProgram {
  void op;
  return encapsulation(p);
}
