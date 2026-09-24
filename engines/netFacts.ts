// ---------------------------------------------------------------------------
// netFacts — what a clicked node or link on a network canvas is, with the
// real numbers from the frame the student is looking at (its links, its
// state, the packet on it). Pure data for the Inspector.
// ---------------------------------------------------------------------------

import type { FactSpec } from "./lessonKit.ts";
import type { CellState, LinkState, NetLink, NetNode, NetPanel, NodeKind } from "../types/visualization.ts";

const KIND: Record<NodeKind, { name: string; lead: string; layer: string; remember: string }> = {
  host: {
    name: "Host",
    lead: "An end system — it creates data and consumes it. Every conversation starts and ends at a host.",
    layer: "All 5 (runs the whole stack)",
    remember: "Hosts are the edge of the network; everything in between just forwards.",
  },
  server: {
    name: "Server",
    lead: "A host that waits for requests and answers them — web, mail, files, names.",
    layer: "All 5 (runs the whole stack)",
    remember: "Server is a role, not a kind of hardware: it listens on a well-known port.",
  },
  switch: {
    name: "Switch",
    lead: "Joins hosts in one LAN. It reads each frame's destination MAC and sends it out of just the one port that leads there.",
    layer: "2 — Data Link",
    remember: "Switch = layer 2, MAC table, one collision domain per port.",
  },
  hub: {
    name: "Hub",
    lead: "A repeater with many ports: every bit that comes in goes out of every other port.",
    layer: "1 — Physical",
    remember: "Hub = layer 1, one big collision domain.",
  },
  router: {
    name: "Router",
    lead: "Joins different networks. It reads the destination IP and picks the next hop from its routing table.",
    layer: "3 — Network",
    remember: "Router = layer 3, routing table, separates broadcast domains.",
  },
  tap: {
    name: "Bus tap",
    lead: "Where a host's drop cable clamps onto the shared backbone. Every tap hears every signal on the bus.",
    layer: "1 — Physical",
    remember: "On a bus, one break in the backbone splits the network in two.",
  },
  cloud: {
    name: "Network cloud",
    lead: "Some network we are not drawing in detail — an ISP, the internet.",
    layer: "—",
    remember: "A cloud means 'details not shown', not 'no structure'.",
  },
};

const STATE: Record<CellState, string> = {
  idle: "waiting",
  active: "sending / forwarding right now",
  visited: "the frame has already passed through",
  new: "just joined",
  removing: "being removed",
  target: "the destination",
  found: "delivered — the frame arrived here",
  failed: "cut off — the frame died next to it",
};

const LINK_STATE: Record<LinkState, string> = {
  idle: "idle — nothing on it this frame",
  active: "carrying the frame right now",
  reserved: "on the route the frame took (or reserved for a circuit)",
  congested: "congested — packets queue here",
  down: "cut — no signal gets through",
};

export function nodeFact(n: NetNode, panel: NetPanel): { title: string; kind: string; spec: FactSpec } {
  const k = KIND[n.kind];
  const links = panel.links.filter((l) => l.from === n.id || l.to === n.id);
  const up = links.filter((l) => l.state !== "down");
  const neighbours = links.map((l) => (l.from === n.id ? l.to : l.from)).map((id) => label(panel, id));
  const rows: [string, string][] = [
    ["Layer", k.layer],
    ["Links", `${links.length}${up.length !== links.length ? ` (${links.length - up.length} cut)` : ""}`],
    ["Right now", STATE[n.state]],
  ];
  if (n.badge) rows.push(["Badge", n.badge]);
  return {
    title: n.label || k.name,
    kind: k.name,
    spec: {
      lead: k.lead,
      rows,
      chips: neighbours.length ? [{ label: "Wired to", items: neighbours }] : undefined,
      more:
        links.length > 0 && up.length === 0
          ? "Every one of its links is cut, so nothing can reach it."
          : links.length === 1 && n.kind !== "tap"
            ? "It has exactly one link, so that link is a single point of failure for it."
            : undefined,
      remember: k.remember,
    },
  };
}

export function linkFact(l: NetLink, panel: NetPanel): { title: string; kind: string; spec: FactSpec } {
  const a = label(panel, l.from);
  const b = label(panel, l.to);
  const pk = panel.packets.find((p) => p.linkId === l.id);
  const rows: [string, string][] = [
    ["Ends", `${a} ↔ ${b}`],
    ["Right now", LINK_STATE[l.state]],
  ];
  if (l.label) rows.push(["Label", l.label]);
  if (pk) rows.push(["On it", `${pk.label} · ${pk.state}`]);
  return {
    title: `${a} – ${b}`,
    kind: l.backbone ? "Backbone link" : "Link",
    spec: {
      lead: l.backbone
        ? "A backbone segment: shared by everything that crosses this part of the network."
        : "A point-to-point link. It carries bits between exactly two devices.",
      rows,
      more:
        l.state === "down"
          ? "Frames that needed this link now need another path. Whether one exists is the whole question of topology."
          : undefined,
      remember: "Links carry bits; they do not decide anything. Decisions happen in the nodes.",
    },
  };
}

function label(panel: NetPanel, id: string): string {
  const n = panel.nodes.find((x) => x.id === id);
  if (!n) return id;
  if (n.kind === "tap") return `${id.slice(1)}'s tap`;
  return n.label || id;
}
