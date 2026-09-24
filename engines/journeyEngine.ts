// ---------------------------------------------------------------------------
// journeyEngine — the capstone Master Simulation.
//
// One request crosses a real little network: PC → switch → R1 → R2 → server,
// with R3 as a detour. At every hop the full header stack is shown, and the
// fields that changed are marked — so the student sees for themselves that
// MAC addresses are rewritten on every link, TTL drops at every router, and
// IP addresses and ports never change end to end. Faults (a cut link, a low
// TTL, a closed port) break it in the ways each unit taught.
// ---------------------------------------------------------------------------

import type { JourneyProgram, JourneyStep, NetLink, NetNode, NetPanel, Packet, PduLayer, Prediction, StepMessage } from "@/types/visualization";
import type { ControlSet } from "./controls.ts";
import { ask } from "./lessonKit.ts";

export type JourneyOp = "masterSimulation";

export interface JourneyParams {
  op: JourneyOp;
  cut: "none" | "r1r2" | "both";
  ttl: number;
  port: number;
  domain: string;
}

export const JOURNEY_DEFAULTS: JourneyParams = { op: "masterSimulation", cut: "none", ttl: 64, port: 80, domain: "www.example.com" };

const MAC: Record<string, string> = { PC: "a4:5e:60:1b:22:9c", R1a: "00:1a:2b:00:00:01", R1b: "00:1a:2b:00:01:01", R2a: "00:1a:2b:00:00:02", R2b: "00:1a:2b:00:01:02", R3: "00:1a:2b:00:00:03", SRV: "3c:22:fb:10:8e:01" };
const PC_IP = "10.0.0.5";
const SRV_IP = "93.184.216.34";

const NODES: NetNode[] = [
  { id: "PC", label: "PC", kind: "host", x: 4, y: 50, state: "idle", badge: PC_IP },
  { id: "SW", label: "SW", kind: "switch", x: 22, y: 50, state: "idle" },
  { id: "R1", label: "R1", kind: "router", x: 42, y: 50, state: "idle", badge: "10.0.0.1" },
  { id: "R3", label: "R3", kind: "router", x: 62, y: 12, state: "idle" },
  { id: "R2", label: "R2", kind: "router", x: 78, y: 50, state: "idle" },
  { id: "SRV", label: "Web", kind: "server", x: 96, y: 50, state: "idle", badge: SRV_IP },
];
const LINKS: NetLink[] = [
  { id: "l-pc", from: "PC", to: "SW", state: "idle" },
  { id: "l-sw", from: "SW", to: "R1", state: "idle" },
  { id: "l-12", from: "R1", to: "R2", state: "idle", label: "cost 1" },
  { id: "l-13", from: "R1", to: "R3", state: "idle", label: "cost 2" },
  { id: "l-32", from: "R3", to: "R2", state: "idle", label: "cost 2" },
  { id: "l-2s", from: "R2", to: "SRV", state: "idle" },
];

function panel(p: JourneyParams, link: string | null, at: string, pkt: Partial<Packet> = {}, lit: string[] = []): NetPanel {
  const down = new Set(p.cut === "r1r2" ? ["l-12"] : p.cut === "both" ? ["l-12", "l-32"] : []);
  return {
    id: "journey",
    label: "The network",
    sub: `${p.domain} · port ${p.port}`,
    nodes: NODES.map((n) => ({ ...n, state: n.id === at ? "active" : lit.includes(n.id) ? "visited" : n.id === "SRV" ? "target" : "idle", ring: n.id === "PC" || n.id === "SRV" })),
    links: LINKS.map((l) => ({ ...l, state: down.has(l.id) ? "down" : l.id === link ? "active" : lit.includes(l.id) ? "reserved" : "idle" })),
    packets: link ? [{ id: "pk", label: pkt.label ?? "SYN", linkId: link, t: pkt.t ?? 0.6, kind: pkt.kind ?? "data", state: pkt.state ?? "flying" }] : [],
  };
}

function stack(o: { app?: [string, string][]; sport?: number; flags?: string; srcIp?: string; dstIp?: string; ttl: number; ethDst: string; ethSrc: string; changed?: string[]; proto?: string }): PduLayer[] {
  const ch = o.changed ?? [];
  return [
    ...(o.app ? [{ layer: "Application" as const, name: o.proto === "UDP" ? "DNS" : "HTTP", fields: o.app, changed: ch.filter((c) => o.app!.some((f) => f[0] === c)) }] : []),
    { layer: "Transport", name: o.proto ?? "TCP", fields: o.srcIp === SRV_IP ? [["Src port", "PORT"], ["Dst port", "51000"], ["Flags", o.flags ?? "SYN"]] : [["Src port", String(o.sport ?? 51000)], ["Dst port", o.proto === "UDP" ? "53" : "PORT"], ["Flags", o.flags ?? "SYN"]], changed: ch.filter((c) => ["Flags"].includes(c)) },
    { layer: "Network", name: "IPv4", fields: [["Src IP", o.srcIp ?? PC_IP], ["Dst IP", o.dstIp ?? SRV_IP], ["TTL", String(o.ttl)]], changed: ch.filter((c) => ["TTL", "Src IP", "Dst IP"].includes(c)) },
    { layer: "Data Link", name: "Ethernet", fields: [["Dst MAC", o.ethDst], ["Src MAC", o.ethSrc], ["FCS", "recomputed"]], changed: ch.filter((c) => ["Dst MAC", "Src MAC", "FCS"].includes(c)) },
    { layer: "Physical", name: "Bits", fields: [["Medium", "copper / fibre"], ["Encoding", "per link"]] },
  ];
}

class Sim {
  steps: JourneyStep[] = [];
  p: JourneyParams;
  constructor(p: JourneyParams) {
    this.p = p;
  }
  add(phase: string, at: string, panelArg: NetPanel, pdu: PduLayer[], description: string, label: string, extra: { predict?: Prediction; message?: StepMessage; codeLines?: number[] } = {}) {
    // Every transport "PORT" placeholder becomes the lesson's port.
    const fixed = pdu.map((l) => ({ ...l, fields: l.fields.map(([k, v]) => [k, v === "PORT" ? String(this.p.port) : v] as [string, string]) }));
    this.steps.push({ phase, at, panels: [panelArg], pdu: fixed, description, label, ...extra });
  }
}

export function runJourneyOperation(pIn: JourneyParams): JourneyProgram {
  const p = { ...pIn, ttl: Math.max(1, Math.min(255, Math.round(pIn.ttl))), port: Math.max(1, Math.min(65535, Math.round(pIn.port))) };
  const S = new Sim(p);
  const open = [80, 443].includes(p.port);
  const via3 = p.cut === "r1r2";
  const unreachable = p.cut === "both";
  let ttl = p.ttl;

  S.add("start", "PC", panel(p, null, "PC"), [], `You open http://${p.domain}. The PC knows the server's IP (${SRV_IP}, from DNS) but the server is on another network — so every frame goes first to the default gateway, R1.`, "start", { codeLines: [1] });

  // ARP
  S.add("ARP", "SW", panel(p, "l-pc", "SW", { label: "ARP?", kind: "broadcast" }), [{ layer: "Data Link", name: "ARP request", fields: [["Dst MAC", "ff:ff:ff:ff:ff:ff (broadcast)"], ["Who has", "10.0.0.1?"], ["Tell", PC_IP]], changed: ["Dst MAC"] }], "The PC knows R1's IP but not its MAC. It broadcasts an ARP request; the switch floods it out of every port.", "ARP", {
    codeLines: [2],
    predict: ask("The PC needs to send to a server on another network. Whose MAC address does it put in the Ethernet header?", "The default gateway's (R1)", ["The web server's", "The switch's", "Broadcast ff:ff:ff:ff:ff:ff"], "MAC addresses only reach across one link; the first link ends at the gateway.", 1),
  });
  S.add("ARP", "PC", panel(p, "l-sw", "R1", { label: "ARP ✓", kind: "control", t: 0.3 }, ["PC", "SW"]), [{ layer: "Data Link", name: "ARP reply", fields: [["10.0.0.1 is at", MAC.R1a]] }], `R1 answers: "10.0.0.1 is at ${MAC.R1a}". The PC caches it.`, "ARP ✓", { codeLines: [2] });

  // SYN from PC
  const base = { flags: "SYN", ttl, ethDst: MAC.R1a, ethSrc: MAC.PC };
  S.add("TCP", "SW", panel(p, "l-pc", "SW", { label: "SYN" }), stack({ ...base, changed: ["Flags", "Dst MAC", "Src MAC", "TTL"] }), `The SYN is built top-down: TCP → port ${p.port}, IP → ${SRV_IP} with TTL ${ttl}, Ethernet → R1's MAC. The switch forwards it by MAC; it doesn't touch any header.`, "PC → SW", {
    codeLines: [3],
    predict: ask("The switch forwards the frame to R1. Which headers does the switch change?", "None", ["The Ethernet MACs", "The TTL", "The IP addresses"], "A switch is a layer-2 device that forwards without rewriting — it only reads the destination MAC.", 0),
  });

  // At R1
  ttl -= 1;
  if (ttl <= 0) {
    S.add("IP", "R1", panel(p, null, "R1", {}, ["PC", "SW", "l-pc", "l-sw"]), stack({ ...base, ttl: 0, changed: ["TTL"] }), `R1 decrements TTL to 0 and discards the packet, sending ICMP Time Exceeded back to the PC. Your TTL of ${p.ttl} was too small.`, "TTL 0", {
      codeLines: [4],
      message: { text: "TTL expired at R1 — ICMP Time Exceeded", tone: "error" },
      predict: ask(`The packet left the PC with TTL ${p.ttl}. R1 decrements it. What happens?`, "It hits 0 and is dropped", ["It is forwarded with TTL 0", "R1 resets it to 64", "It is delivered anyway"], "Every router subtracts 1; at 0 the packet dies.", 0),
    });
    return finish(S, p, "TTL expired");
  }
  S.add("IP", "R1", panel(p, via3 ? "l-13" : unreachable ? null : "l-12", "R1", { label: "SYN", t: 0.3 }, ["PC", "SW", "l-pc", "l-sw"]), stack({ ...base, ttl, ethDst: via3 ? MAC.R3 : MAC.R2a, ethSrc: MAC.R1b, changed: ["TTL", "Dst MAC", "Src MAC", "FCS"] }), unreachable ? "R1 strips the Ethernet header and looks up 93.184.216.34 — but both paths to R2 are down." : `R1 strips the old Ethernet header, looks up ${SRV_IP} (longest-prefix match), decrements TTL to ${ttl}, and builds a new Ethernet header for the next link${via3 ? " — the direct link to R2 is down, so its routing table now points at R3" : ""}.`, "R1", {
    codeLines: [4],
    predict: ask("Crossing R1, which fields change?", "TTL and both MAC addresses", ["Only the TTL", "The IP addresses", "Nothing — routers only forward"], "New link → new Ethernet header; every router → TTL − 1. IPs and ports stay put.", 2),
  });
  if (unreachable) {
    S.add("IP", "R1", panel(p, null, "R1", {}, ["PC", "SW", "l-pc", "l-sw"]), stack({ ...base, ttl, changed: [] }), "No route: R1 drops the packet and returns ICMP Destination Unreachable. The PC's TCP will retry and eventually give up.", "unreachable", {
      codeLines: [5],
      message: { text: "Both paths cut — Destination Unreachable", tone: "error" },
    });
    return finish(S, p, "unreachable");
  }
  if (via3) {
    ttl -= 1;
    S.add("IP", "R3", panel(p, "l-32", "R3", { label: "SYN", t: 0.4 }, ["PC", "SW", "R1", "l-pc", "l-sw", "l-13"]), stack({ ...base, ttl, ethDst: MAC.R2b, ethSrc: MAC.R3, changed: ["TTL", "Dst MAC", "Src MAC", "FCS"] }), `The detour: R3 does the same job — TTL ${ttl}, new MACs. The packet takes one extra hop, but the routing protocol (Unit 3) found a way round.`, "R3", {
      codeLines: [4],
      message: { text: "Rerouted via R3", tone: "warn" },
    });
  }
  ttl -= 1;
  if (ttl <= 0) {
    S.add("IP", "R2", panel(p, null, "R2", {}, ["PC", "SW", "R1"]), stack({ ...base, ttl: 0, changed: ["TTL"] }), "TTL hits 0 at R2 — dropped, ICMP Time Exceeded.", "TTL 0", { message: { text: "TTL expired at R2", tone: "error" } });
    return finish(S, p, "TTL expired");
  }
  S.add("IP", "R2", panel(p, "l-2s", "R2", { label: "SYN", t: 0.5 }, ["PC", "SW", "R1", "l-pc", "l-sw", via3 ? "l-13" : "l-12", ...(via3 ? ["R3", "l-32"] : [])]), stack({ ...base, ttl, ethDst: MAC.SRV, ethSrc: MAC.R2a, changed: ["TTL", "Dst MAC", "Src MAC", "FCS"] }), `R2 is directly connected to the server's network: TTL ${ttl}, and this time the Ethernet destination is the server itself.`, "R2", {
    codeLines: [4],
    predict: ask(`The packet left the PC with TTL ${p.ttl}. What is its TTL when it reaches the server?`, String(ttl), [String(p.ttl), String(ttl + 1), String(ttl - 1)], `One per router: ${via3 ? "R1, R3, R2 = 3" : "R1, R2 = 2"} routers.`, ttl),
  });
  const path = ["PC", "SW", "R1", "R2", "SRV", "l-pc", "l-sw", "l-2s", ...(via3 ? ["R3", "l-13", "l-32"] : ["l-12"])];
  if (!open) {
    S.add("TCP", "SRV", panel(p, "l-2s", "SRV", { label: "RST", kind: "control", t: 0.2 }, path), stack({ ...base, flags: "RST, ACK", ttl: 64, srcIp: SRV_IP, dstIp: PC_IP, ethDst: MAC.R2a, ethSrc: MAC.SRV, changed: ["Flags"] }), `The SYN arrives, but nothing is listening on port ${p.port}. The server answers RST — "connection refused".`, "RST", {
      codeLines: [6],
      message: { text: `Port ${p.port} closed — RST`, tone: "error" },
      predict: ask(`Nothing listens on port ${p.port}. How does the server respond to the SYN?`, "With a TCP RST", ["It ignores it", "With a SYN-ACK", "With an HTTP 404"], "A closed TCP port answers RST; HTTP never even starts.", 0),
    });
    return finish(S, p, "refused");
  }
  S.add("TCP", "SRV", panel(p, "l-2s", "SRV", { label: "SYN-ACK", kind: "control", t: 0.2 }, path), stack({ ...base, flags: "SYN, ACK", ttl: 64, srcIp: SRV_IP, dstIp: PC_IP, ethDst: MAC.R2a, ethSrc: MAC.SRV, changed: ["Flags", "Src IP", "Dst IP"] }), `Delivered. The server's TCP sees port ${p.port} is open and replies SYN-ACK — with source and destination swapped. The reply may even take a different path back.`, "SYN-ACK", {
    codeLines: [6],
    predict: ask("Compare the SYN that left the PC with the one that reached the server. What stayed the same the whole way?", "IP addresses and ports", ["MAC addresses", "The TTL", "The FCS"], "End-to-end fields (IP, TCP) never change; per-link fields (Ethernet, TTL, FCS) change at every hop.", 3),
  });
  S.add("HTTP", "SRV", panel(p, "l-2s", "SRV", { label: "200 OK", kind: "ack", t: 0.3 }, path), stack({ app: [["Request", `GET / HTTP/1.1`], ["Host", p.domain], ["Response", "200 OK · text/html"]], flags: "PSH, ACK", ttl: 64, srcIp: SRV_IP, dstIp: PC_IP, ethDst: MAC.R2a, ethSrc: MAC.SRV, changed: ["Response"] }), "The handshake completes, the GET goes out the same way, and 200 OK comes back — every packet crossing the same hops, re-framed at every link.", "HTTP", {
    codeLines: [7],
    message: { text: `Page loaded${via3 ? " — via the detour" : ""}`, tone: "ok" },
  });
  return finish(S, p, "loaded");
}

function finish(S: Sim, p: JourneyParams, outcome: string): JourneyProgram {
  const hops = S.steps.filter((s) => ["R1", "R2", "R3"].includes(s.at) && s.phase === "IP").length;
  return {
    steps: S.steps,
    title: `Master Simulation — ${p.domain}`,
    pseudocode: [
      "PC: server not on my subnet → send to default gateway",
      "ARP: learn the gateway's MAC",
      "build SYN: TCP port, IP addresses + TTL, Ethernet to gateway",
      "each router: route lookup, TTL − 1, new Ethernet header",
      "no route / TTL 0 → drop + ICMP",
      "server: port open → SYN-ACK, closed → RST",
      "HTTP GET → 200 OK over the same path",
    ],
    stats: [
      { label: "Outcome", value: outcome, tone: outcome === "loaded" ? "mint" : "coral" },
      { label: "Routers crossed", value: String(hops), tone: "signal" },
      { label: "Start TTL", value: String(p.ttl), tone: "amber" },
      { label: "Path", value: p.cut === "r1r2" ? "via R3" : p.cut === "both" ? "none" : "R1 → R2", tone: "signal" },
    ],
  };
}

export function journeyControls(): ControlSet {
  return {
    title: "Break it",
    icon: "developer_board",
    controls: [
      { key: "domain", label: "Domain", type: "text", maxLength: 40, pattern: "^[a-zA-Z0-9-]+(\\.[a-zA-Z0-9-]+)+$" },
      { key: "port", label: "Server port", type: "number", min: 1, max: 65535, hint: "80 and 443 are open; anything else is closed." },
      { key: "ttl", label: "Starting TTL", type: "number", min: 1, max: 255, hint: "Try 1 or 2." },
      { key: "cut", label: "Cut links", type: "select", options: [{ value: "none", label: "All links up" }, { value: "r1r2", label: "Cut R1–R2 (detour via R3)" }, { value: "both", label: "Cut R1–R2 and R3–R2" }] },
    ],
    tryThis: "Cut R1–R2 and watch TTL drop one extra time on the detour; then set TTL to 2.",
  };
}
