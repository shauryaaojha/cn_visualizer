// ---------------------------------------------------------------------------
// frameEngine — header anatomy, field by field, to scale.
//
// Each lesson fills a frame (or segment) in one field at a time with the
// student's own values — their MACs, their ports, their payload size — so
// the Inspector can say what each field holds *in this run*. HDLC adds a
// bit-stuffing stream; Port Numbers adds a demultiplexing view.
// ---------------------------------------------------------------------------

import type { DemuxApp, FrameField, FrameProgram, FrameStep, HeaderTone, Prediction } from "@/types/visualization";
import type { ControlSet } from "./controls.ts";
import { ask, near } from "./lessonKit.ts";

export type FrameOp = "ethernet" | "hdlc" | "ppp" | "udp" | "tcp" | "ports";

export interface FrameParams {
  op: FrameOp;
  payload: number;
  srcPort: number;
  dstPort: number;
  seq: number;
  flags: "SYN" | "ACK" | "PSH,ACK" | "FIN,ACK";
  data: string;
  hdlcType: "I" | "S" | "U";
}

export const FRAME_DEFAULTS: FrameParams = { op: "ethernet", payload: 20, srcPort: 51000, dstPort: 80, seq: 1000, flags: "PSH,ACK", data: "0111111011111100", hdlcType: "I" };

export const FRAME_OP_DEFAULTS: Partial<Record<FrameOp, Partial<FrameParams>>> = {
  ethernet: { payload: 20 },
  udp: { dstPort: 53, payload: 32 },
  tcp: { dstPort: 443, payload: 100 },
  ports: { dstPort: 443 },
};

interface Spec {
  id: string;
  name: string;
  bits: number;
  value: string;
  tone: HeaderTone;
  /** Narration when this field is filled in. */
  say: string;
  label?: string;
  predict?: Prediction;
}

function build(specs: Spec[], intro: string, rowBits: number | undefined, extra: Partial<FrameStep>[] = []): FrameStep[] {
  const steps: FrameStep[] = [];
  const fields = (upTo: number, focus: number): FrameField[] =>
    specs.map((s, i) => ({ id: s.id, name: s.name, bits: s.bits, value: i <= upTo ? s.value : "", tone: s.tone, about: s.say, state: i > upTo ? "empty" : i === focus ? "new" : "set" }));
  steps.push({ fields: fields(-1, -1), rowBits, description: intro, label: "empty" });
  specs.forEach((s, i) => steps.push({ fields: fields(i, i), rowBits, description: s.say, label: s.label ?? s.name.split(" ")[0].toLowerCase(), predict: s.predict }));
  extra.forEach((e) => steps.push({ fields: fields(specs.length, -1), rowBits, description: "", ...e }));
  return steps;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number.isFinite(v) ? v : lo)));
const B = (bytes: number) => bytes * 8;

// --- Ethernet -----------------------------------------------------------------

function ethernet(p: FrameParams): FrameProgram {
  const data = clamp(p.payload, 1, 1500);
  const pad = Math.max(0, 46 - data);
  const total = 14 + data + pad + 4;
  const specs: Spec[] = [
    { id: "pre", name: "Preamble + SFD", bits: B(8), value: "10101010 ×7 · 10101011", tone: "coral", say: "8 bytes of alternating 1s and 0s let the receiver's clock lock on; the last byte (SFD, ending 11) says 'frame starts now'. Not counted in the frame size.", label: "preamble" },
    { id: "dst", name: "Destination MAC", bits: B(6), value: "3c:22:fb:10:8e:01", tone: "mint", say: "Destination MAC first — so a switch can start forwarding before the rest of the frame has even arrived.", label: "dst", predict: ask("Which address comes first in an Ethernet frame?", "Destination MAC", ["Source MAC", "Destination IP", "Source IP"], "Destination first: switches and NICs decide 'is this for me / where does it go' as early as possible.", 0) },
    { id: "src", name: "Source MAC", bits: B(6), value: "a4:5e:60:1b:22:9c", tone: "mint", say: "Source MAC — the sending NIC. Switches learn which port each MAC lives on from this field.", label: "src" },
    { id: "type", name: "EtherType", bits: B(2), value: "0x0800 (IPv4)", tone: "amber", say: "EtherType 0x0800 says the payload is an IPv4 packet (0x86DD would be IPv6, 0x0806 ARP).", label: "type" },
    { id: "data", name: "Payload", bits: B(data), value: `${data} B of IP packet`, tone: "signal", say: `The payload: your ${data}-byte IP packet. Ethernet carries 46 to 1500 bytes.`, label: "data" },
    ...(pad ? [{ id: "pad", name: "Padding", bits: B(pad), value: `${pad} B of zeros`, tone: "violet" as HeaderTone, say: `${data} bytes is under the 46-byte minimum, so ${pad} bytes of padding are added. Minimum frame = 64 bytes, long enough for CSMA/CD to hear a collision before it finishes sending.`, label: "pad", predict: ask(`The payload is ${data} bytes. How many bytes of padding does Ethernet add?`, String(pad), near(pad, [2, -2, 6]).concat(["0"]), "Payload must be at least 46 bytes: 46 − payload.", pad) }] : []),
    { id: "fcs", name: "FCS (CRC-32)", bits: B(4), value: "0x9E1F4C07", tone: "coral", say: "The Frame Check Sequence: a CRC-32 over everything from destination MAC to the end of the payload. A mismatch and the frame is silently dropped.", label: "FCS" },
  ];
  const steps = build(specs, `An Ethernet frame carrying a ${data}-byte packet. Watch it fill in, field by field, at true scale.`, undefined, [
    {
      label: "size",
      description: `Frame size: 14-byte header + ${data + pad} bytes of payload${pad ? " (with padding)" : ""} + 4-byte FCS = ${total} bytes (plus the 8-byte preamble on the wire).`,
      message: { text: `${total}-byte frame · ${Math.round((data / (total + 8)) * 100)}% of the bits are your data`, tone: "ok" },
      predict: ask("Header + FCS, not counting the preamble — how many bytes of overhead?", "18", ["14", "26", "8"], "6 + 6 + 2 header bytes, plus the 4-byte FCS.", 1),
    },
  ]);
  return { steps, title: `Ethernet Frame — ${data} B payload`, pseudocode: ["preamble + SFD (8 B)", "destination MAC, source MAC (6 B each)", "EtherType (2 B)", "payload 46–1500 B (pad if short)", "FCS: CRC-32 (4 B)"], stats: [
    { label: "Frame", value: `${total} B`, tone: "signal" },
    { label: "Payload", value: `${data} B`, tone: "mint" },
    { label: "Padding", value: `${pad} B`, tone: pad ? "amber" : "mint" },
    { label: "Efficiency", value: `${Math.round((data / (total + 8)) * 100)}%`, tone: "amber" },
  ] };
}

// --- HDLC (with bit stuffing) -------------------------------------------------------

export function stuff(bits: string): { out: string; marks: number[] } {
  let out = "";
  let run = 0;
  const marks: number[] = [];
  for (const b of bits) {
    out += b;
    run = b === "1" ? run + 1 : 0;
    if (run === 5) {
      marks.push(out.length);
      out += "0";
      run = 0;
    }
  }
  return { out, marks };
}

function hdlc(p: FrameParams): FrameProgram {
  const data = /^[01]{4,24}$/.test(p.data) ? p.data : "0111111011111100";
  const { out, marks } = stuff(data);
  const ctrl = { I: "0 · N(S)=3 · P · N(R)=5", S: "10 · RR · N(R)=5", U: "11 · SABM" }[p.hdlcType] ?? "";
  const specs: Spec[] = [
    { id: "f1", name: "Flag", bits: 8, value: "01111110", tone: "coral", say: "Every HDLC frame starts with the flag 01111110 — the only place six 1s in a row are allowed." },
    { id: "addr", name: "Address", bits: 8, value: "0x03", tone: "mint", say: "Address: which secondary station this frame is for (on a point-to-point link it barely matters)." },
    { id: "ctrl", name: "Control", bits: 8, value: ctrl, tone: "amber", say: `Control: this is a${p.hdlcType === "I" ? "n I-frame (information, with send/receive sequence numbers)" : p.hdlcType === "S" ? "n S-frame (supervisory — RR/RNR/REJ acknowledgements)" : " U-frame (unnumbered — link setup and teardown)"}.`, predict: ask("An HDLC frame carrying user data with sequence numbers is which type?", "I-frame", ["S-frame", "U-frame", "F-frame"], "I = information (data + N(S), N(R)); S = supervisory (ACK/flow); U = unnumbered (control).", 2) },
    { id: "info", name: "Information", bits: out.length, value: out, tone: "signal", say: `The data after bit stuffing: ${marks.length} extra 0${marks.length === 1 ? "" : "s"} inserted.` },
    { id: "fcs", name: "FCS", bits: 16, value: "CRC-16", tone: "coral", say: "FCS: CRC-16 (or 32) over address, control and information." },
    { id: "f2", name: "Flag", bits: 8, value: "01111110", tone: "coral", say: "Closing flag. Everything between the two flags is the frame." },
  ];
  const steps = build(specs, "HDLC on a serial link: bits, not bytes. The receiver finds frames by looking for the flag 01111110.", undefined);
  // bit-stuffing frames, inserted before the Information field is filled
  const at = steps.findIndex((s) => s.label === "information");
  const stuffSteps: FrameStep[] = [
    { ...steps[at - 1], stream: { label: "Your data", bits: data }, label: "data", description: `Your data: ${data}. It contains ${/111111/.test(data) ? "six 1s in a row — which would look exactly like a flag" : "runs of 1s that must never reach six"}.`, predict: undefined },
    {
      ...steps[at - 1],
      stream: { label: "After stuffing", bits: out, marks },
      label: "stuff",
      description: `Bit stuffing: after every five 1s in a row, the sender inserts a 0. ${marks.length} zero${marks.length === 1 ? "" : "s"} added (${data.length} → ${out.length} bits). The receiver removes any 0 that follows five 1s.`,
      message: { text: `${marks.length} stuffed bit${marks.length === 1 ? "" : "s"}`, tone: "info" },
      predict: ask(`How many 0s does bit stuffing insert into ${data}?`, String(marks.length), near(marks.length, [1, -1, 2]), "Insert a 0 after every run of five consecutive 1s — count the runs.", marks.length),
    },
  ];
  steps.splice(at, 0, ...stuffSteps);
  steps.forEach((s) => (s.stream = s.stream ?? (s.label === "information" || steps.indexOf(s) > at ? { label: "On the wire (stuffed)", bits: out, marks } : undefined)));
  return { steps, title: "HDLC Frame & Bit Stuffing", pseudocode: ["flag 01111110", "address, control", "information (bit-stuffed)", "FCS", "flag"], stats: [
    { label: "Data bits", value: String(data.length), tone: "signal" },
    { label: "Stuffed", value: `+${marks.length}`, tone: "amber" },
    { label: "Frame type", value: `${p.hdlcType}-frame`, tone: "mint" },
  ] };
}

// --- PPP ---------------------------------------------------------------------------

function ppp(p: FrameParams): FrameProgram {
  const data = clamp(p.payload, 1, 1500);
  const specs: Spec[] = [
    { id: "f1", name: "Flag", bits: 8, value: "0x7E", tone: "coral", say: "PPP borrowed HDLC's framing: flag 0x7E. Being byte-oriented, it uses byte stuffing (escape 0x7D) instead of bit stuffing." },
    { id: "addr", name: "Address", bits: 8, value: "0xFF", tone: "mint", say: "Address is always 0xFF — 'all stations'. On a point-to-point link there is only one other end." },
    { id: "ctrl", name: "Control", bits: 8, value: "0x03", tone: "amber", say: "Control is always 0x03: unnumbered frame. PPP does no sequencing — no ACKs, no retransmission." },
    { id: "proto", name: "Protocol", bits: 16, value: "0x0021 (IPv4)", tone: "violet", say: "Protocol says what is inside: 0x0021 IPv4, 0xC021 LCP (link setup), 0xC023 PAP, 0x8021 IPCP.", predict: ask("The PPP Protocol field is 0xC021. What is inside?", "LCP — link control", ["An IPv4 packet", "User login (PAP)", "An IPv6 packet"], "0xC021 is LCP, used to set up and test the link before any IP flows.", 1) },
    { id: "info", name: "Information", bits: B(data), value: `${data} B`, tone: "signal", say: `The ${data}-byte packet (up to 1500 by default).` },
    { id: "fcs", name: "FCS", bits: 16, value: "CRC-16", tone: "coral", say: "FCS: 2-byte CRC (4 if negotiated)." },
    { id: "f2", name: "Flag", bits: 8, value: "0x7E", tone: "coral", say: "Closing flag." },
  ];
  const steps = build(specs, "PPP — how two routers (or your old dial-up modem) share a direct link.", undefined, [
    { label: "phases", description: "Before any IP moves: Dead → Establish (LCP negotiates MTU, authentication) → Authenticate (PAP or CHAP) → Network (IPCP assigns IP addresses) → Open. Then IP packets flow in frames exactly like this one.", message: { text: "LCP → PAP/CHAP → IPCP → data", tone: "ok" }, predict: ask("Which PPP phase comes first?", "Link establishment (LCP)", ["Authentication (PAP/CHAP)", "Network (IPCP)", "Data transfer"], "LCP must first agree on the link itself; only then can you authenticate over it.", 2) },
  ]);
  return { steps, title: "PPP Frame", pseudocode: ["flag 0x7E", "address 0xFF, control 0x03", "protocol (what's inside)", "information", "FCS, flag"], stats: [
    { label: "Overhead", value: "8 B", tone: "signal" },
    { label: "Payload", value: `${data} B`, tone: "mint" },
    { label: "Sequencing", value: "none", tone: "amber" },
  ] };
}

// --- UDP / TCP ------------------------------------------------------------------

function udp(p: FrameParams): FrameProgram {
  const data = clamp(p.payload, 0, 1472);
  const specs: Spec[] = [
    { id: "sp", name: "Source port", bits: 16, value: String(clamp(p.srcPort, 1, 65535)), tone: "mint", say: `Source port ${p.srcPort}: where replies should go.`, label: "src" },
    { id: "dp", name: "Destination port", bits: 16, value: String(clamp(p.dstPort, 1, 65535)), tone: "mint", say: `Destination port ${p.dstPort}: which process on the receiving host gets this.`, label: "dst" },
    { id: "len", name: "Length", bits: 16, value: String(8 + data), tone: "amber", say: `Length = header + data = 8 + ${data} = ${8 + data} bytes.`, predict: ask(`The datagram carries ${data} bytes of data. What goes in the Length field?`, String(8 + data), [String(data), String(20 + data), String(data - 8 < 0 ? 4 : data - 8)], "UDP Length counts its own 8-byte header plus the data.", data) },
    { id: "ck", name: "Checksum", bits: 16, value: "0x1C46", tone: "coral", say: "Checksum over header, data and a pseudo-header of IP addresses. Optional in IPv4 (0 = unused), mandatory in IPv6." },
    { id: "data", name: "Data", bits: B(Math.min(data, 16)), value: `${data} B`, tone: "signal", say: "Then the data. That's it — four fields, 8 bytes, no promises." },
  ];
  const steps = build(specs, "A UDP header, drawn 32 bits per row as in the RFC.", 32, [
    { label: "total", description: "UDP's whole header is 8 bytes. No sequence numbers, no ACKs, no window — which is exactly why DNS, video calls and games use it.", message: { text: "8-byte header — vs TCP's 20+", tone: "ok" } },
  ]);
  return { steps, title: `UDP Header — port ${p.dstPort}`, pseudocode: ["source port (16)", "destination port (16)", "length (16)", "checksum (16)", "data"], stats: [
    { label: "Header", value: "8 B", tone: "mint" },
    { label: "Length", value: `${8 + data} B`, tone: "signal" },
  ] };
}

function tcp(p: FrameParams): FrameProgram {
  const data = clamp(p.payload, 0, 1460);
  const seq = clamp(p.seq, 0, 4_000_000_000);
  const syn = p.flags === "SYN";
  const specs: Spec[] = [
    { id: "sp", name: "Source port", bits: 16, value: String(p.srcPort), tone: "mint", say: `Source port ${p.srcPort} — the client's temporary (ephemeral) port.`, label: "src" },
    { id: "dp", name: "Destination port", bits: 16, value: String(p.dstPort), tone: "mint", say: `Destination port ${p.dstPort} — the server's well-known service.`, label: "dst" },
    { id: "seq", name: "Sequence number", bits: 32, value: String(seq), tone: "signal", say: `Sequence number ${seq}: the number of the first data byte in this segment. TCP numbers bytes, not segments.`, label: "seq" },
    { id: "ack", name: "Acknowledgement number", bits: 32, value: syn ? "0 (unused)" : "5001", tone: "signal", say: syn ? "ACK number: unused on a bare SYN." : "ACK number 5001: the next byte this side expects from the other.", label: "ack" },
    { id: "hl", name: "Header length", bits: 4, value: "5 (×4 = 20 B)", tone: "amber", say: "Header length in 32-bit words: 5 = 20 bytes, no options.", label: "hlen", predict: ask("Header length field says 5. How long is the header?", "20 bytes", ["5 bytes", "40 bytes", "10 bytes"], "Counted in 4-byte words: 5 × 4 = 20.", 1) },
    { id: "rs", name: "Reserved", bits: 6, value: "000000", tone: "violet", say: "Reserved bits (some now used for ECN).", label: "rsv" },
    { id: "fl", name: "Flags", bits: 6, value: p.flags, tone: "coral", say: `Flags: ${p.flags}. URG ACK PSH RST SYN FIN — the control bits that open, run and close connections.`, label: "flags" },
    { id: "win", name: "Window", bits: 16, value: "65535", tone: "amber", say: "Receive window: how many more bytes the sender of this segment can accept — flow control.", label: "win" },
    { id: "ck", name: "Checksum", bits: 16, value: "0xB1E6", tone: "coral", say: "Checksum — mandatory in TCP.", label: "cksum" },
    { id: "urg", name: "Urgent pointer", bits: 16, value: "0", tone: "violet", say: "Urgent pointer: only meaningful with URG set; almost never used.", label: "urg" },
  ];
  const steps = build(specs, "A TCP header, 32 bits per row. Ten fields, 20 bytes before any options.", 32, [
    { label: "next seq", description: `This segment carries ${data} bytes starting at ${seq}, so the next segment will start at ${seq + data}.`, message: { text: "20-byte header, every byte numbered", tone: "ok" }, predict: ask(`seq = ${seq}, ${data} bytes of data. What is the next segment's seq?`, String(seq + data), [String(seq + 1), String(seq + data + 1), String(seq + 20)], "Byte numbering: next seq = seq + data length.", data) },
  ]);
  return { steps, title: `TCP Header — ${p.flags}`, pseudocode: ["ports (16 + 16)", "sequence number (32)", "acknowledgement (32)", "hlen, flags, window", "checksum, urgent pointer, options"], stats: [
    { label: "Header", value: "20 B", tone: "signal" },
    { label: "Seq", value: String(seq), tone: "mint" },
    { label: "Flags", value: p.flags, tone: "amber" },
  ] };
}

// --- Port numbers ----------------------------------------------------------------------

const APPS: DemuxApp[] = [
  { name: "sshd", port: 22, proto: "TCP" },
  { name: "DNS resolver", port: 53, proto: "UDP" },
  { name: "nginx (HTTP)", port: 80, proto: "TCP" },
  { name: "nginx (HTTPS)", port: 443, proto: "TCP" },
  { name: "Chrome tab", port: 51000, proto: "TCP" },
];

function ports(p: FrameParams): FrameProgram {
  const dst = clamp(p.dstPort, 1, 65535);
  const target = APPS.find((a) => a.port === dst);
  const range = dst < 1024 ? "well-known (0–1023)" : dst < 49152 ? "registered (1024–49151)" : "dynamic / ephemeral (49152–65535)";
  const base: Omit<FrameStep, "description"> = { fields: [{ id: "dp", name: "Destination port", bits: 16, value: String(dst), tone: "mint", state: "focus" }], demux: { apps: APPS } };
  const steps: FrameStep[] = [
    { ...base, label: "host", description: "One IP address, many conversations. The IP address gets a packet to this machine; the port number gets it to the right program." },
    { ...base, label: "arrive", demux: { apps: APPS, incoming: { port: dst, proto: target?.proto ?? "TCP", label: `seg → :${dst}` } }, description: `A segment arrives for port ${dst}.`, predict: ask(`A segment arrives for port ${dst}. Which process gets it?`, target ? target.name : "None — the port is closed", APPS.map((a) => a.name).filter((n) => n !== target?.name).slice(0, 3).concat(target ? ["None — the port is closed"] : []), target ? `${target.name} is listening on ${dst}.` : "Nothing listens there: TCP answers RST, UDP an ICMP port-unreachable.", dst) },
    { ...base, label: target ? "deliver" : "closed", demux: { apps: APPS.map((a) => ({ ...a, active: a.port === dst })), incoming: { port: dst, proto: target?.proto ?? "TCP", label: `seg → :${dst}` } }, description: target ? `Demultiplexing: the transport layer looks up port ${dst} and hands the data to ${target.name}.` : `No process is listening on ${dst}. TCP replies with RST.`, message: target ? { text: `:${dst} → ${target.name}`, tone: "ok" } : { text: `Port ${dst} closed — RST`, tone: "error" } },
    { ...base, label: "range", description: `Port ${dst} is ${range}. Servers listen on well-known ports; your browser's side of every connection uses a temporary ephemeral port like 51000.`, predict: ask(`Port ${dst} falls in which range?`, range.split(" (")[0], ["well-known", "registered", "dynamic / ephemeral"].filter((r) => r !== range.split(" (")[0]), "0–1023 well-known, 1024–49151 registered, 49152–65535 dynamic.", dst % 3) },
  ];
  return { steps, title: `Port Numbers — :${dst}`, pseudocode: ["IP address → which host", "port → which process on it", "socket = (IP, port); connection = pair of sockets"], stats: [
    { label: "Port", value: String(dst), tone: "signal" },
    { label: "Range", value: range.split(" (")[0], tone: "amber" },
    { label: "Process", value: target?.name ?? "none", tone: target ? "mint" : "coral" },
  ] };
}

export function runFrameOperation(p: FrameParams): FrameProgram {
  switch (p.op) {
    case "ethernet":
      return ethernet(p);
    case "hdlc":
      return hdlc(p);
    case "ppp":
      return ppp(p);
    case "udp":
      return udp(p);
    case "tcp":
      return tcp(p);
    case "ports":
      return ports(p);
  }
}

export function frameControls(op: FrameOp): ControlSet {
  const PAYLOAD = (max: number) => ({ key: "payload", label: "Payload bytes", type: "number" as const, min: 0, max });
  switch (op) {
    case "ethernet":
      return { title: "Ethernet", icon: "settings_ethernet", controls: [{ ...PAYLOAD(1500), min: 1, hint: "Under 46 bytes gets padded." }], tryThis: "Send 1 byte — it still leaves as a 64-byte frame." };
    case "hdlc":
      return { title: "HDLC", icon: "flag", controls: [{ key: "data", label: "Data bits", type: "text", maxLength: 24, pattern: "^[01]{4,24}$" }, { key: "hdlcType", label: "Frame type", type: "chips", options: ["I", "S", "U"].map((v) => ({ value: v, label: `${v}-frame` })), columns: 3 }] };
    case "ppp":
      return { title: "PPP", icon: "compare_arrows", controls: [{ ...PAYLOAD(1500), min: 1 }] };
    case "udp":
      return { title: "UDP", icon: "bolt", controls: [PAYLOAD(1472), { key: "srcPort", label: "Source port", type: "number", min: 1, max: 65535 }, { key: "dstPort", label: "Destination port", type: "number", min: 1, max: 65535 }] };
    case "tcp":
      return { title: "TCP", icon: "receipt_long", controls: [PAYLOAD(1460), { key: "seq", label: "Sequence number", type: "number", min: 0, max: 4000000000 }, { key: "flags", label: "Flags", type: "select", options: ["SYN", "ACK", "PSH,ACK", "FIN,ACK"].map((v) => ({ value: v, label: v })) }, { key: "dstPort", label: "Destination port", type: "number", min: 1, max: 65535 }] };
    case "ports":
      return { title: "Ports", icon: "door_front", controls: [{ key: "dstPort", label: "Destination port", type: "number", min: 1, max: 65535, hint: "Try 22, 53, 80, 443, 51000 — or a closed one." }] };
  }
}
