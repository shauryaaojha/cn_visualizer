// ---------------------------------------------------------------------------
// netEngine — nodes, links and packets.
//
// Pure functions only. `run` compiles an operation into a flat NetProgram of
// frames; the player just walks them. No React, no timers, no unseeded
// randomness — that is what makes playback scrubbable and replayable.
//
// Everything is built from ONE idea: the same hosts wired five different ways.
// Topologies are generated from a host count rather than hand-placed, and the
// path a frame takes is found by breadth-first search rather than written down,
// so sender, receiver, host count and the severed link are all free variables
// the student can change.
// ---------------------------------------------------------------------------

import type {
  CellState,
  Fault,
  NetLink,
  NetNode,
  NetPanel,
  NetProgram,
  NetStep,
  NodeKind,
  Packet,
  StepMessage,
} from "@/types/visualization";

export const HOST_IDS = ["A", "B", "C", "D", "E", "F", "G", "H"];
export const MIN_HOSTS = 4;
export const MAX_HOSTS = 8;

// --- small builders ---------------------------------------------------------

const N = (id: string, label: string, kind: NodeKind, x: number, y: number): NetNode => ({
  id,
  label,
  kind,
  x,
  y,
  state: "idle",
});

const L = (id: string, from: string, to: string, backbone = false): NetLink => ({
  id,
  from,
  to,
  state: "idle",
  backbone,
});

/** Evenly spaced points on a circle, first one at twelve o'clock. */
function circlePos(i: number, n: number, r = 38, cx = 50, cy = 50): [number, number] {
  const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
  return [Math.round((cx + r * Math.cos(a)) * 10) / 10, Math.round((cy + r * Math.sin(a)) * 10) / 10];
}

const hostsOnCircle = (n: number) =>
  HOST_IDS.slice(0, n).map((id, i) => {
    const [x, y] = circlePos(i, n);
    return N(id, id, "host", x, y);
  });

interface TopoSpec {
  id: string;
  label: string;
  sub: string;
  nodes: NetNode[];
  links: NetLink[];
  /** The sentence worth reading — written for the *default* cut. */
  why: string;
  spof: string;
}

// --- the five topologies, generated from a host count -----------------------

function bus(n: number): TopoSpec {
  const ids = HOST_IDS.slice(0, n);
  const span = 80;
  const xs = ids.map((_, i) => 10 + (n === 1 ? 0 : (i * span) / (n - 1)));
  return {
    id: "bus",
    label: "Bus",
    sub: "one shared backbone",
    nodes: [
      ...ids.map((id, i) => N(id, id, "host", xs[i], 22)),
      ...ids.map((id, i) => N(`t${id}`, "", "tap", xs[i], 68)),
    ],
    links: [
      ...ids.map((id) => L(`d${id}`, id, `t${id}`)),
      ...ids.slice(0, -1).map((id, i) => L(`s${i}`, `t${id}`, `t${ids[i + 1]}`, true)),
    ],
    why: "The backbone itself is the network. Sever it in the middle and there is no second path — the bus becomes two separate networks that cannot hear each other.",
    spof: "the backbone",
  };
}

function star(n: number): TopoSpec {
  return {
    id: "star",
    label: "Star",
    sub: "every host owns its link to the hub",
    nodes: [...hostsOnCircle(n), N("SW", "SW", "switch", 50, 50)],
    links: HOST_IDS.slice(0, n).map((id) => L(`s${id}`, id, "SW")),
    why: "A cut spoke isolates exactly one host — everyone else keeps talking, which is why star is the topology real offices use. The catch is the middle: kill the hub and all of them die at once.",
    spof: "the central switch",
  };
}

function ring(n: number): TopoSpec {
  const ids = HOST_IDS.slice(0, n);
  return {
    id: "ring",
    label: "Ring",
    sub: "a closed loop — two ways round",
    nodes: hostsOnCircle(n),
    links: ids.map((id, i) => L(`r${i}`, id, ids[(i + 1) % n])),
    why: "A ring has two directions, so a single break just turns the loop into a line — traffic reverses and takes the long way round. It survives one cut. A second cut anywhere else splits it in two.",
    spof: "any second link",
  };
}

function mesh(n: number): TopoSpec {
  const ids = HOST_IDS.slice(0, n);
  const links: NetLink[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) links.push(L(`m${ids[i]}${ids[j]}`, ids[i], ids[j]));
  }
  return {
    id: "mesh",
    label: "Mesh",
    sub: `every host wired to every other — ${links.length} links`,
    nodes: hostsOnCircle(n),
    links,
    why: `Full mesh pays for redundancy up front: ${links.length} links for ${n} hosts. Losing one direct link costs a single extra hop, nothing more. You would have to cut every one of a host's links to silence it.`,
    spof: "none",
  };
}

function hybrid(n: number): TopoSpec {
  const ids = HOST_IDS.slice(0, n);
  const leftCount = Math.ceil(n / 2);
  const left = ids.slice(0, leftCount);
  const right = ids.slice(leftCount);

  // Each group fans out above its own switch.
  const place = (group: string[], cx: number) =>
    group.map((id, i) => {
      const spread = Math.min(34, 14 * Math.max(1, group.length - 1));
      const x = group.length === 1 ? cx : cx - spread / 2 + (i * spread) / (group.length - 1);
      const y = i % 2 === 0 ? 30 : 16;
      return N(id, id, "host", Math.round(x * 10) / 10, y);
    });

  return {
    id: "hybrid",
    label: "Hybrid",
    sub: "two stars joined by a trunk",
    nodes: [
      ...place(left, 28),
      ...place(right, 72),
      N("SW1", "SW1", "switch", 28, 68),
      N("SW2", "SW2", "switch", 72, 68),
    ],
    links: [
      ...left.map((id) => L(`h${id}`, id, "SW1")),
      ...right.map((id) => L(`h${id}`, id, "SW2")),
      L("trunk", "SW1", "SW2", true),
    ],
    why: "Each star keeps working internally — hosts on the same switch still reach each other. But the trunk joining them carries every cross-star conversation, so cutting it splits the site into two islands that each work perfectly and cannot reach each other.",
    spof: "the trunk between the stars",
  };
}

const BUILDERS = { bus, star, ring, mesh, hybrid } as const;
type TopoId = keyof typeof BUILDERS;

// --- pathfinding ------------------------------------------------------------

/**
 * Breadth-first shortest path, returned as the list of link ids to traverse.
 * This is the change that makes everything else parametric: with a real path
 * finder, "who sends", "who receives", "how many hosts" and "which link is
 * cut" stop being baked into the topology and become inputs.
 */
function shortestPath(links: NetLink[], from: string, to: string, down: Set<string>): string[] | null {
  if (from === to) return [];
  const adj = new Map<string, { via: string; next: string }[]>();
  for (const l of links) {
    if (down.has(l.id)) continue;
    if (!adj.has(l.from)) adj.set(l.from, []);
    if (!adj.has(l.to)) adj.set(l.to, []);
    adj.get(l.from)!.push({ via: l.id, next: l.to });
    adj.get(l.to)!.push({ via: l.id, next: l.from });
  }

  const prev = new Map<string, { node: string; via: string }>();
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === to) break;
    for (const edge of adj.get(cur) ?? []) {
      if (seen.has(edge.next)) continue;
      seen.add(edge.next);
      prev.set(edge.next, { node: cur, via: edge.via });
      queue.push(edge.next);
    }
  }
  if (!seen.has(to)) return null;

  const path: string[] = [];
  let cur = to;
  while (cur !== from) {
    const step = prev.get(cur)!;
    path.unshift(step.via);
    cur = step.node;
  }
  return path;
}

/**
 * The link this topology is most interesting to cut: the middle hop of the
 * route actually in use. It always breaks the current path, and on every one of
 * the five topologies it lands on the textbook example — the bus backbone, the
 * receiver's spoke, a ring link, the direct mesh link, the hybrid trunk.
 */
function defaultCut(spec: TopoSpec, from: string, to: string): string | null {
  const path = shortestPath(spec.links, from, to, new Set());
  if (!path || path.length === 0) return null;
  return path[Math.floor(path.length / 2)];
}

/** Human-readable name for a link, for the sidebar's cut selector. */
export function linkLabel(spec: TopoSpec, link: NetLink): string {
  const name = (id: string) => {
    if (id.startsWith("t")) return `${id.slice(1)}'s tap`;
    return id;
  };
  if (link.backbone && link.id === "trunk") return "trunk SW1–SW2";
  if (link.backbone) return `backbone ${name(link.from)}–${name(link.to)}`;
  return `${name(link.from)} – ${name(link.to)}`;
}

// --- frame assembly ---------------------------------------------------------

interface PanelOpts {
  from: string;
  to: string;
  cutId: string | null;
  /** Which hop the packet is on. -1 = not sent yet. >= path.length = arrived. */
  hop: number;
  dim?: boolean;
  verdict?: StepMessage;
}

interface Attempt {
  path: string[];
  dropIdx: number | null;
  survived: boolean;
}

function attempt(spec: TopoSpec, from: string, to: string, cutId: string | null): Attempt {
  const healthy = shortestPath(spec.links, from, to, new Set()) ?? [];
  if (!cutId) return { path: healthy, dropIdx: null, survived: true };

  const rerouted = shortestPath(spec.links, from, to, new Set([cutId]));
  if (rerouted) return { path: rerouted, dropIdx: null, survived: true };

  // No alternate path: the frame walks its usual route until it meets the cut.
  const idx = healthy.indexOf(cutId);
  return { path: healthy, dropIdx: idx >= 0 ? idx : Math.max(0, healthy.length - 1), survived: false };
}

function buildPanel(spec: TopoSpec, o: PanelOpts): NetPanel {
  const { path, dropIdx } = attempt(spec, o.from, o.to, o.cutId);
  const nodes = spec.nodes.map((n) => ({ ...n }));
  const links = spec.links.map((l) => ({ ...l }));
  const byId = new Map(links.map((l) => [l.id, l]));
  const packets: Packet[] = [];

  if (o.cutId) {
    const cut = byId.get(o.cutId);
    if (cut) cut.state = "down";
  }

  const src = nodes.find((n) => n.id === o.from);
  const dst = nodes.find((n) => n.id === o.to);
  if (src) src.ring = true;
  if (dst) {
    dst.ring = true;
    dst.state = "target";
  }

  if (o.hop >= 0 && path.length > 0) {
    const died = dropIdx !== null && o.hop >= dropIdx;
    const reached = dropIdx === null && o.hop >= path.length;
    const travelled = died ? dropIdx! : Math.min(o.hop, path.length);

    // Light the wire behind the packet so the route it took stays readable.
    for (const id of path.slice(0, travelled)) {
      const l = byId.get(id);
      if (!l) continue;
      if (l.state !== "down") l.state = "reserved";
      for (const end of [l.from, l.to]) {
        const nd = nodes.find((x) => x.id === end);
        if (nd && nd.state === "idle") nd.state = "visited";
      }
    }

    const label = `${o.from}→${o.to}`;
    if (died) {
      const l = byId.get(path[dropIdx!])!;
      packets.push({ id: "p", label, linkId: l.id, t: 0.42, kind: "data", state: "dropped" });
      for (const end of [l.from, l.to]) {
        const nd = nodes.find((x) => x.id === end);
        if (nd) nd.state = "failed";
      }
      if (src) src.state = "active";
    } else if (reached) {
      packets.push({
        id: "p",
        label,
        linkId: path[path.length - 1],
        t: 1,
        kind: "data",
        state: "delivered",
      });
      if (dst) dst.state = "found";
      if (src) src.state = "visited";
    } else {
      const l = byId.get(path[o.hop])!;
      l.state = "active";
      packets.push({ id: "p", label, linkId: l.id, t: 0.5, kind: "data", state: "flying" });
      if (src) src.state = "active";
    }
  }

  return {
    id: spec.id,
    label: spec.label,
    sub: spec.sub,
    nodes,
    links,
    packets,
    verdict: o.verdict,
    dim: o.dim,
  };
}

const OK = (text: string): StepMessage => ({ text, tone: "ok" });
const FAIL = (text: string): StepMessage => ({ text, tone: "error" });

/** The hand-written sentence when the student cuts the interesting link; an
 *  honest generated one when they cut something else. */
function whyFor(spec: TopoSpec, a: Attempt, isDefaultCut: boolean, healthyLen: number): string {
  if (isDefaultCut) return spec.why;
  if (!a.survived) return `With that link gone there is no remaining path at all — the network is partitioned and the frame is dropped after ${a.dropIdx} hop${a.dropIdx === 1 ? "" : "s"}.`;
  if (a.path.length === healthyLen)
    return "That link was not on the route in the first place, so nothing changed. Redundancy only matters where the traffic actually flows.";
  return `An alternate path still exists — ${a.path.length} hops instead of ${healthyLen}. The cost of the failure is the extra hop, not a lost frame.`;
}

// --- operation: topoFailure (the flagship) ----------------------------------

const FAILURE_CODE = [
  "for each topology T in {bus, star, ring, mesh, hybrid}:",
  "    wire the SAME hosts",
  "    path <- shortest_path(T, FROM, TO)",
  "    send FRAME along path",
  "",
  "cut the middle link of each topology's route",
  "",
  "for each topology T:",
  "    path <- shortest_path(T, FROM, TO, without cut)",
  "    if path exists:",
  "        reroute, deliver          -- redundancy",
  "    else:",
  "        drop -- the network is partitioned",
];

function topoFailure(from: string, to: string, hosts: number): NetProgram {
  const specs = (Object.keys(BUILDERS) as TopoId[]).map((k) => BUILDERS[k](hosts));
  const cuts = new Map(specs.map((s) => [s.id, defaultCut(s, from, to)]));
  const attempts = new Map(specs.map((s) => [s.id, attempt(s, from, to, cuts.get(s.id)!)]));
  const healthy = new Map(specs.map((s) => [s.id, attempt(s, from, to, null).path]));
  const survivors = specs.filter((s) => attempts.get(s.id)!.survived);
  const steps: NetStep[] = [];

  const frame = (
    o: (s: TopoSpec) => Omit<PanelOpts, "from" | "to">,
    description: string,
    codeLines: number[],
    message?: StepMessage,
  ) => {
    steps.push({
      panels: specs.map((s) => buildPanel(s, { from, to, ...o(s) })),
      description,
      codeLines,
      message,
    });
  };

  // Phase 1 — healthy.
  frame(
    () => ({ cutId: null, hop: -1 }),
    `The same ${hosts} hosts, wired five different ways. ${from} wants to send one frame to ${to}. Watch how differently that journey looks before anything is broken.`,
    [1, 2],
  );

  const maxHealthy = Math.max(...specs.map((s) => healthy.get(s.id)!.length));
  for (let h = 0; h < maxHealthy; h++) {
    const arrived = specs.filter((s) => h >= healthy.get(s.id)!.length).map((s) => s.label);
    frame(
      () => ({ cutId: null, hop: h }),
      h === 0
        ? `${from} transmits. Mesh has a direct link and is already done; the bus has to cross the whole backbone.`
        : `Hop ${h + 1}. ${arrived.length ? `${arrived.join(", ")} already delivered — hop count is the topology's real cost.` : "The frame moves one link closer."}`,
      [3, 4],
    );
  }

  frame(
    (s) => {
      const len = healthy.get(s.id)!.length;
      return { cutId: null, hop: len, verdict: OK(`delivered · ${len} hop${len === 1 ? "" : "s"}`) };
    },
    "All five delivered. On a healthy network every topology looks equally good — which is exactly why topology choice looks like an arbitrary decision until something breaks.",
    [4],
    OK("5 / 5 delivered — no failures yet"),
  );

  // Phase 2 — one cut each.
  frame(
    (s) => ({ cutId: cuts.get(s.id)!, hop: -1 }),
    "Now cut exactly one link in each — the middle hop of the route it was just using, marked in red. One link. Not a device, not a power cut. The most ordinary failure a network suffers.",
    [6],
    { text: "1 link severed in each topology", tone: "warn" },
  );

  const maxCut = Math.max(...specs.map((s) => attempts.get(s.id)!.path.length));
  for (let h = 0; h < maxCut; h++) {
    frame(
      (s) => ({ cutId: cuts.get(s.id)!, hop: h }),
      h === 0
        ? `${from} transmits again. The frames about to die have not noticed anything yet — a sender cannot see a break further down the path.`
        : `Hop ${h + 1}. The survivors are rerouting; the rest have already met the cut.`,
      [8, 9],
    );
  }

  frame(
    (s) => {
      const a = attempts.get(s.id)!;
      return {
        cutId: cuts.get(s.id)!,
        hop: maxCut,
        verdict: a.survived ? OK(`rerouted · ${a.path.length} hops`) : FAIL("dropped · no path"),
      };
    },
    `${survivors.length} survived, ${specs.length - survivors.length} did not — and each failure has a completely different structural cause. That difference is the whole point of studying topology.`,
    [10, 11, 12, 13],
    {
      text: `${survivors.length} / ${specs.length} survived — ${survivors.map((s) => s.label.toLowerCase()).join(" and ") || "none"} rerouted`,
      tone: "warn",
    },
  );

  // Phase 3 — narrate each in turn.
  for (const spec of specs) {
    const a = attempts.get(spec.id)!;
    steps.push({
      panels: specs.map((s) =>
        buildPanel(s, {
          from,
          to,
          cutId: cuts.get(s.id)!,
          hop: maxCut,
          dim: s.id !== spec.id,
          verdict:
            s.id !== spec.id
              ? undefined
              : a.survived
                ? OK(`rerouted · ${a.path.length} hops`)
                : FAIL("dropped · no path"),
        }),
      ),
      description: `${spec.label}: ${whyFor(spec, a, true, healthy.get(spec.id)!.length)}`,
      codeLines: a.survived ? [10, 11] : [12, 13],
      message: a.survived
        ? OK(`${spec.label} survives — single point of failure: ${spec.spof}`)
        : FAIL(`${spec.label} partitioned — single point of failure: ${spec.spof}`),
    });
  }

  // Phase 4 — the takeaway.
  steps.push({
    panels: specs.map((s) =>
      buildPanel(s, {
        from,
        to,
        cutId: cuts.get(s.id)!,
        hop: maxCut,
        verdict: attempts.get(s.id)!.survived ? OK("survived") : FAIL("partitioned"),
      }),
    ),
    description:
      "Redundancy is the only thing separating them. Mesh buys it with links, ring gets it free from its loop, and bus, star and hybrid each concentrate the whole network's fate into one cable. Cost, resilience — pick two.",
    codeLines: [10, 11, 12, 13],
    message: OK("Survivors: ring (two directions) and mesh (alternate links)"),
  });

  return {
    steps,
    title: `Topology Failure — ${from} → ${to}, ${hosts} hosts`,
    pseudocode: FAILURE_CODE,
    stats: [
      { label: "Topologies", value: "5", tone: "signal" },
      { label: "Links cut", value: "5", tone: "coral" },
      { label: "Survived", value: `${survivors.length} / ${specs.length}`, tone: "mint" },
    ],
  };
}

// --- operation: a single topology -------------------------------------------

const SINGLE_CODE = [
  "wire the hosts in this topology",
  "path <- shortest_path(FROM, TO)",
  "for each link on path:",
  "    forward the frame one hop",
  "deliver to TO",
  "",
  "-- fault injected --",
  "cut the chosen link",
  "path <- shortest_path(FROM, TO, without cut)",
  "if path exists: reroute",
  "else: drop -- network partitioned",
];

function singleTopo(spec: TopoSpec, from: string, to: string, cutId: string | null): NetProgram {
  const steps: NetStep[] = [];
  const healthy = attempt(spec, from, to, null);
  const suggested = defaultCut(spec, from, to);

  const push = (o: Omit<PanelOpts, "from" | "to">, description: string, codeLines: number[], message?: StepMessage) =>
    steps.push({ panels: [buildPanel(spec, { from, to, ...o })], description, codeLines, message });

  if (healthy.path.length === 0) {
    push(
      { cutId: null, hop: -1 },
      `${from} and ${to} are the same host — pick a different sender or receiver in the sidebar.`,
      [1],
      { text: "sender and receiver must differ", tone: "warn" },
    );
    return { steps, title: `${spec.label} Topology`, pseudocode: SINGLE_CODE, stats: [] };
  }

  push(
    { cutId: null, hop: -1 },
    `${spec.label} topology: ${spec.sub}. ${spec.nodes.filter((n) => n.kind === "host").length} hosts, ${spec.links.length} links. ${from} is about to send one frame to ${to}.`,
    [1, 2],
  );

  for (let h = 0; h < healthy.path.length; h++) {
    push(
      { cutId: null, hop: h },
      h === 0
        ? `${from} puts the frame on the wire.`
        : `Hop ${h + 1} of ${healthy.path.length} — the frame moves one link closer to ${to}.`,
      [3, 4],
    );
  }

  push(
    { cutId: null, hop: healthy.path.length, verdict: OK(`delivered · ${healthy.path.length} hops`) },
    `Delivered in ${healthy.path.length} hop${healthy.path.length === 1 ? "" : "s"}. The single point of failure here is ${spec.spof}.`,
    [5],
    OK("delivered"),
  );

  if (cutId) {
    const a = attempt(spec, from, to, cutId);
    const link = spec.links.find((l) => l.id === cutId);
    push(
      { cutId, hop: -1 },
      `${link ? linkLabel(spec, link) : "One link"} cut. Nothing tells ${from} that anything has changed — it will simply try again.`,
      [7, 8],
      { text: "link severed", tone: "warn" },
    );

    for (let h = 0; h < a.path.length; h++) {
      push({ cutId, hop: h }, `Retrying — hop ${h + 1}.`, [9]);
    }

    push(
      {
        cutId,
        hop: a.path.length,
        verdict: a.survived ? OK(`rerouted · ${a.path.length} hops`) : FAIL("dropped · no path"),
      },
      whyFor(spec, a, cutId === suggested, healthy.path.length),
      a.survived ? [10] : [11],
      a.survived
        ? OK(`${spec.label} survives the cut — rerouted in ${a.path.length} hops`)
        : FAIL(`${spec.label} is partitioned — ${to} is unreachable`),
    );
  }

  const cutAttempt = cutId ? attempt(spec, from, to, cutId) : null;
  return {
    steps,
    title: `${spec.label} Topology — ${from} → ${to}`,
    pseudocode: SINGLE_CODE,
    stats: [
      { label: "Hosts", value: String(spec.nodes.filter((n) => n.kind === "host").length), tone: "signal" },
      { label: "Links", value: String(spec.links.length), tone: "signal" },
      { label: `Hops ${from}→${to}`, value: String(healthy.path.length), tone: "amber" },
      ...(cutAttempt
        ? [
            {
              label: "After the cut",
              value: cutAttempt.survived ? `${cutAttempt.path.length} hops` : "unreachable",
              tone: cutAttempt.survived ? ("mint" as const) : ("coral" as const),
            },
          ]
        : []),
    ],
  };
}

// --- public surface ---------------------------------------------------------

export type NetOp = "topoBus" | "topoStar" | "topoRing" | "topoMesh" | "topoHybrid" | "topoFailure";

const TOPO_FOR: Record<Exclude<NetOp, "topoFailure">, TopoId> = {
  topoBus: "bus",
  topoStar: "star",
  topoRing: "ring",
  topoMesh: "mesh",
  topoHybrid: "hybrid",
};

export interface NetRunParams {
  op: NetOp;
  from: string;
  to: string;
  hosts: number;
  faults: Fault[];
}

/** The topology behind an op — used by the sidebar to list cuttable links. */
export function specFor(op: NetOp, hosts: number): TopoSpec | null {
  if (op === "topoFailure") return null;
  return BUILDERS[TOPO_FOR[op]](hosts);
}

/** Links the student can choose to sever, with the suggested one marked. */
export function cuttableLinks(
  op: NetOp,
  hosts: number,
  from: string,
  to: string,
): { id: string; label: string; suggested: boolean }[] {
  const spec = specFor(op, hosts);
  if (!spec) return [];
  const suggested = defaultCut(spec, from, to);
  return spec.links.map((l) => ({
    id: l.id,
    label: linkLabel(spec, l),
    suggested: l.id === suggested,
  }));
}

/** The link we preselect in the sidebar: the middle hop of the live route. */
export function suggestedCut(op: NetOp, hosts: number, from: string, to: string): string | null {
  const spec = specFor(op, hosts);
  return spec ? defaultCut(spec, from, to) : null;
}

export function runNetOperation(p: NetRunParams): NetProgram {
  const hosts = Math.max(MIN_HOSTS, Math.min(MAX_HOSTS, p.hosts));
  const ids = HOST_IDS.slice(0, hosts);
  const from = ids.includes(p.from) ? p.from : ids[0];
  const to = ids.includes(p.to) ? p.to : ids[ids.length - 2] ?? ids[ids.length - 1];

  if (p.op === "topoFailure") return topoFailure(from, to, hosts);

  const spec = BUILDERS[TOPO_FOR[p.op]](hosts);
  const linkDown = p.faults.find((f) => f.kind === "linkDown");
  const cutId = linkDown && "id" in linkDown ? linkDown.id : null;
  // A cut that no longer exists (host count changed under it) is simply ignored.
  const valid = cutId && spec.links.some((l) => l.id === cutId) ? cutId : null;
  return singleTopo(spec, from, to, valid);
}

export const NET_OPERATIONS: { id: NetOp; label: string; icon: string; subpath: string }[] = [
  { id: "topoBus", label: "Bus", icon: "horizontal_rule", subpath: "topologies/bus" },
  { id: "topoStar", label: "Star", icon: "star", subpath: "topologies/star" },
  { id: "topoRing", label: "Ring", icon: "radio_button_unchecked", subpath: "topologies/ring" },
  { id: "topoMesh", label: "Mesh", icon: "hub", subpath: "topologies/mesh" },
  { id: "topoHybrid", label: "Hybrid", icon: "account_tree", subpath: "topologies/hybrid" },
  { id: "topoFailure", label: "Failure", icon: "link_off", subpath: "topologies/failure-comparison" },
];

export type { CellState };
