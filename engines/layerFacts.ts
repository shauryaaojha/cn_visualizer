// ---------------------------------------------------------------------------
// layerFacts — what each layer does, what runs there, and what its header
// actually carries. Pure data, shared by layerEngine (narration, Predict
// questions) and LayerCanvas (the Inspector cards).
//
// Header fields are built from the student's own inputs, so clicking the IP
// header shows *their* source and destination, not a textbook example.
// ---------------------------------------------------------------------------

import type { LayerRunParams } from "@/engines/layerEngine";

export interface LayerFact {
  /** One sentence: the job, in plain words. */
  job: string;
  protocols: string[];
  devices: string[];
  /** The exam-style one-liner students get asked. */
  remember: string;
}

/** Keyed by lane name so OSI and TCP/IP lanes both resolve. */
export const LAYER_FACTS: Record<string, LayerFact> = {
  Application: {
    job: "Gives programs a way to ask the network for something — fetch a page, send mail, look up a name.",
    protocols: ["HTTP", "HTTPS", "DNS", "SMTP", "FTP", "SSH"],
    devices: ["Hosts", "Servers", "Gateways"],
    remember: "Closest to the user; the only layer an app talks to directly.",
  },
  Presentation: {
    job: "Translates data so both ends read it the same way: encoding, compression, encryption.",
    protocols: ["TLS/SSL", "JPEG", "PNG", "ASCII", "UTF-8", "MPEG"],
    devices: ["Hosts"],
    remember: "The translator — syntax and format, not meaning.",
  },
  Session: {
    job: "Opens, keeps alive, checkpoints and closes the conversation between two applications.",
    protocols: ["RPC", "NetBIOS", "PPTP", "SQL sessions"],
    devices: ["Hosts"],
    remember: "Dialog control and synchronisation (checkpoints).",
  },
  Transport: {
    job: "Splits data into segments, numbers them, and delivers them to the right application by port.",
    protocols: ["TCP", "UDP", "SCTP"],
    devices: ["Hosts", "Firewalls (L4)", "Load balancers"],
    remember: "End-to-end delivery; ports identify the process.",
  },
  Network: {
    job: "Adds logical (IP) addresses and picks a route across many networks.",
    protocols: ["IPv4", "IPv6", "ICMP", "OSPF", "BGP"],
    devices: ["Routers", "Layer-3 switches"],
    remember: "Host-to-host across networks; routers live here.",
  },
  "Data Link": {
    job: "Frames the packet for the next physical hop, adds MAC addresses, and checks for bit errors.",
    protocols: ["Ethernet", "Wi-Fi (802.11)", "PPP", "HDLC", "ARP"],
    devices: ["Switches", "Bridges", "NICs"],
    remember: "Hop-to-hop delivery; MAC addresses; error detection (CRC).",
  },
  Physical: {
    job: "Turns bits into voltage, light or radio and sends them over the medium.",
    protocols: ["Ethernet PHY", "DSL", "USB", "Bluetooth PHY"],
    devices: ["Hubs", "Repeaters", "Cables", "Modems"],
    remember: "Bits, signals, connectors and cables — no addresses at all.",
  },
  Internet: {
    job: "Routes packets across independent networks using IP — the TCP/IP name for OSI Layer 3.",
    protocols: ["IPv4", "IPv6", "ICMP", "ARP"],
    devices: ["Routers"],
    remember: "Maps to OSI Layer 3.",
  },
  "Network Access": {
    job: "Everything below IP: framing, MAC addressing and the physical signal — OSI Layers 2 and 1 together.",
    protocols: ["Ethernet", "Wi-Fi", "PPP", "DSL"],
    devices: ["Switches", "NICs", "Cables"],
    remember: "Maps to OSI Layers 2 + 1.",
  },
};

export interface HeaderField {
  name: string;
  value: string;
  bits?: number;
}

export interface HeaderFact {
  /** Full name — "Transmission Control Protocol header". */
  name: string;
  /** Size in bytes, or null for OSI's notional 5–7 headers. */
  bytes: number | null;
  fields: HeaderField[];
  /** Who reads it on the way. */
  readBy: string;
}

/** Fake-but-plausible MACs, stable across renders. */
const SRC_MAC = "3C:22:FB:0A:51:E2";
const DST_MAC = "A4:5E:60:C1:07:9B";

export function headerFacts(id: string, p: LayerRunParams): HeaderFact | null {
  switch (id) {
    case "AH":
      return {
        name: "Application header",
        bytes: null,
        fields: [{ name: "What", value: "Protocol request, e.g. GET / HTTP/1.1" }],
        readBy: "The receiving application only. In real TCP/IP, layers 5–7 are one layer with no separate header.",
      };
    case "PH":
      return {
        name: "Presentation header",
        bytes: null,
        fields: [
          { name: "Encoding", value: "ASCII / UTF-8" },
          { name: "Compression", value: "none" },
          { name: "Encryption", value: "TLS (if HTTPS)" },
        ],
        readBy: "The receiver's presentation layer. Notional in OSI; TLS does this job in practice.",
      };
    case "SH":
      return {
        name: "Session header",
        bytes: null,
        fields: [
          { name: "Session ID", value: "0x1f3a" },
          { name: "Checkpoint", value: "none" },
        ],
        readBy: "The receiver's session layer — which conversation this belongs to.",
      };
    case "TCP":
      return {
        name: "TCP header",
        bytes: 20,
        fields: [
          { name: "Source port", value: String(p.srcPort), bits: 16 },
          { name: "Destination port", value: String(p.dstPort), bits: 16 },
          { name: "Sequence number", value: "1", bits: 32 },
          { name: "ACK number", value: "1", bits: 32 },
          { name: "Flags", value: "PSH, ACK", bits: 9 },
          { name: "Window", value: "64240", bits: 16 },
          { name: "Checksum", value: "0x9c41", bits: 16 },
        ],
        readBy: "Only the two end hosts. Routers never look inside it.",
      };
    case "IP":
      return {
        name: "IPv4 header",
        bytes: 20,
        fields: [
          { name: "Version", value: "4", bits: 4 },
          { name: "TTL", value: "64", bits: 8 },
          { name: "Protocol", value: "6 (TCP)", bits: 8 },
          { name: "Source IP", value: p.srcIp, bits: 32 },
          { name: "Destination IP", value: p.dstIp, bits: 32 },
        ],
        readBy: "Every router on the path — it is the only header they read.",
      };
    case "MAC":
    case "ETH":
      return {
        name: "Ethernet header",
        bytes: 14,
        fields: [
          { name: "Destination MAC", value: DST_MAC, bits: 48 },
          { name: "Source MAC", value: SRC_MAC, bits: 48 },
          { name: "EtherType", value: "0x0800 (IPv4)", bits: 16 },
        ],
        readBy: "The next switch or NIC. Rewritten at every hop — unlike the IP header.",
      };
    case "FCS":
      return {
        name: "Frame Check Sequence",
        bytes: 4,
        fields: [{ name: "CRC-32", value: "0x5A3C19E7", bits: 32 }],
        readBy: "The receiving NIC recomputes it; a mismatch means a bit flipped and the frame is dropped.",
      };
    default:
      return null;
  }
}
