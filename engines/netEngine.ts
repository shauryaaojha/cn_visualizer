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
import { ask, near, tag } from "./lessonKit.ts";

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
    extra?: Pick<NetStep, "label" | "predict">,
  ) => {
    steps.push({
      panels: specs.map((s) => buildPanel(s, { from, to, ...o(s) })),
      description,
      codeLines,
      message,
      ...extra,
    });
  };

  // Phase 1 — healthy.
  frame(
    () => ({ cutId: null, hop: -1 }),
    `The same ${hosts} hosts, wired five different ways. ${from} wants to send one frame to ${to}. Watch how differently that journey looks before anything is broken.`,
    [1, 2],
    undefined,
    { label: "wired" },
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
      undefined,
      {
        label: `hop ${h + 1}`,
        predict:
          h === 0
            ? ask(
                `All five send ${from} → ${to} at once. Which topology delivers first?`,
                "Mesh",
                ["Bus", "Star", "Ring", "Hybrid"],
                "A full mesh has a direct link between every pair of hosts, so it is always one hop.",
                2,
              )
            : undefined,
      },
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
    { label: "5/5 ✓" },
  );

  // Phase 2 — one cut each.
  frame(
    (s) => ({ cutId: cuts.get(s.id)!, hop: -1 }),
    "Now cut exactly one link in each — the middle hop of the route it was just using, marked in red. One link. Not a device, not a power cut. The most ordinary failure a network suffers.",
    [6],
    { text: "1 link severed in each topology", tone: "warn" },
    { label: "✂ cut" },
  );

  const maxCut = Math.max(...specs.map((s) => attempts.get(s.id)!.path.length));
  for (let h = 0; h < maxCut; h++) {
    frame(
      (s) => ({ cutId: cuts.get(s.id)!, hop: h }),
      h === 0
        ? `${from} transmits again. The frames about to die have not noticed anything yet — a sender cannot see a break further down the path.`
        : `Hop ${h + 1}. The survivors are rerouting; the rest have already met the cut.`,
      [8, 9],
      undefined,
      { label: `↻${h + 1}` },
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
    {
      label: `${survivors.length}/5`,
      predict: ask(
        "One link cut in each topology. How many of the five still deliver the frame?",
        `${survivors.length} of 5`,
        ["5 of 5", "0 of 5", "1 of 5", "3 of 5", "4 of 5"],
        `Only ${survivors.map((s) => s.label.toLowerCase()).join(" and ") || "none"} have a second path: a ring can go the other way round, a mesh has spare links.`,
        1,
      ),
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
      label: spec.label.toLowerCase(),
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
    label: "takeaway",
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

  const push = (
    o: Omit<PanelOpts, "from" | "to">,
    description: string,
    codeLines: number[],
    message?: StepMessage,
    extra?: Pick<NetStep, "label" | "predict">,
  ) => steps.push({ panels: [buildPanel(spec, { from, to, ...o })], description, codeLines, message, ...extra });

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
    undefined,
    { label: "wired" },
  );

  const hops = healthy.path.length;
  for (let h = 0; h < hops; h++) {
    push(
      { cutId: null, hop: h },
      h === 0
        ? `${from} puts the frame on the wire.`
        : `Hop ${h + 1} of ${hops} — the frame moves one link closer to ${to}.`,
      [3, 4],
      undefined,
      {
        label: `hop ${h + 1}`,
        predict:
          h === 0
            ? ask(
                `On this ${spec.label.toLowerCase()}, how many links will the frame cross to get from ${from} to ${to}?`,
                String(hops),
                near(hops, hops > 1 ? [-1, 1, 3] : [1, 2, 3]),
                `The shortest path ${from} → ${to} here is ${hops} link${hops === 1 ? "" : "s"}${spec.id === "bus" ? " — each host hangs off its own tap, so a bus costs two drops plus the backbone between them" : ""}.`,
                hops,
              )
            : undefined,
      },
    );
  }

  push(
    { cutId: null, hop: hops, verdict: OK(`delivered · ${hops} hops`) },
    `Delivered in ${hops} hop${hops === 1 ? "" : "s"}. The single point of failure here is ${spec.spof}.`,
    [5],
    OK("delivered"),
    { label: "✓" },
  );

  if (cutId) {
    const a = attempt(spec, from, to, cutId);
    const link = spec.links.find((l) => l.id === cutId);
    push(
      { cutId, hop: -1 },
      `${link ? linkLabel(spec, link) : "One link"} cut. Nothing tells ${from} that anything has changed — it will simply try again.`,
      [7, 8],
      { text: "link severed", tone: "warn" },
      { label: "✂ cut" },
    );

    for (let h = 0; h < a.path.length; h++) {
      push({ cutId, hop: h }, `Retrying — hop ${h + 1}.`, [9], undefined, { label: `↻${h + 1}` });
    }

    const cutName = link ? linkLabel(spec, link) : "That link";
    const offRoute = a.survived && a.path.length === healthy.path.length;
    const outcome = !a.survived
      ? "Dropped — no path is left"
      : offRoute
        ? "Delivered on the same path"
        : `Rerouted — ${a.path.length} hops`;
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
      {
        label: a.survived ? (offRoute ? "same path" : "reroute") : "✕ drop",
        predict: ask(
          `${cutName} is cut. What happens to ${from}'s next frame to ${to}?`,
          outcome,
          [
            "Dropped — no path is left",
            "Delivered on the same path",
            `Rerouted — ${healthy.path.length + 1} hops`,
            `Rerouted — ${healthy.path.length + 2} hops`,
          ],
          whyFor(spec, a, cutId === suggested, healthy.path.length),
          a.path.length + (a.survived ? 1 : 0),
        ),
      },
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

// --- operation: Introduction to Networks (Packet Lifecycle) ----------------

const INTRO_CODE = [
  "Alice creates message M = 'HELLO'",
  "Segment into packets: P1='HE', P2='LL', P3='O'",
  "Attach headers: [Src:Alice, Dst:Bob, Seq:i]",
  "NIC serializes bits onto wire to Switch",
  "Switch stores packet in buffer & looks up MAC table",
  "Switch forwards packet on output port to Bob",
  "Bob verifies FCS checksum & reassembles message",
];

function introNetwork(cutId: string | null): NetProgram {
  const steps: NetStep[] = [];
  const nodes: NetNode[] = [
    N("Alice", "Alice", "host", 15, 50),
    N("SW", "Switch", "switch", 50, 50),
    N("Bob", "Bob", "host", 85, 50),
  ];
  const links: NetLink[] = [
    L("l1", "Alice", "SW"),
    L("l2", "SW", "Bob"),
  ];

  if (cutId === "l1") links[0].state = "down";
  if (cutId === "l2") links[1].state = "down";

  // Step 1: Idle
  steps.push({
    panels: [{ id: "intro", label: "Network Communication", nodes: [...nodes], links: [...links], packets: [] }],
    description: "Alice wants to send the message 'HELLO' to Bob over the network. Networks transfer information in discrete, structured chunks called packets rather than one continuous unmanaged stream.",
    codeLines: [1],
    strip: { label: "Payload Buffer", chips: [{ text: "H", state: "active" }, { text: "E", state: "active" }, { text: "L", state: "active" }, { text: "L", state: "active" }, { text: "O", state: "active" }] },
  });

  // Step 2: Packetization
  steps.push({
    panels: [{ id: "intro", label: "Network Communication", nodes: [{ ...nodes[0], state: "active" }, nodes[1], nodes[2]], links: [...links], packets: [] }],
    description: "Host A (Alice) segments the message into 3 numbered packets (P1: 'HE', P2: 'LL', P3: 'O') and clamps on source/destination network headers.",
    codeLines: [2, 3],
    strip: { label: "Created Packets", chips: [{ text: "P1:[HE]", state: "done" }, { text: "P2:[LL]", state: "done" }, { text: "P3:[O]", state: "done" }] },
  });

  if (cutId === "l1") {
    steps.push({
      panels: [{ id: "intro", label: "Network Communication", nodes: [{ ...nodes[0], state: "active" }, nodes[1], nodes[2]], links: [{ ...links[0], state: "down" }, links[1]], packets: [{ id: "p1", label: "P1", linkId: "l1", t: 0.3, kind: "data", state: "dropped" }] }],
      description: "Alice's NIC attempts to push P1 onto Link 1, but the physical wire is severed! The electrical signal is lost and transmission fails immediately.",
      codeLines: [4],
      message: FAIL("Transmission failed: Link Alice-Switch is down"),
    });
    return {
      steps,
      title: "What Is a Network? — Packet Transmission",
      pseudocode: INTRO_CODE,
      stats: [{ label: "Status", value: "Link Severed", tone: "coral" }, { label: "Payload", value: "5 Bytes" }],
    };
  }

  // Step 3: P1 to switch
  steps.push({
    panels: [{ id: "intro", label: "Network Communication", nodes: [{ ...nodes[0], state: "visited" }, { ...nodes[1], state: "active" }, nodes[2]], links: [{ ...links[0], state: "active" }, links[1]], packets: [{ id: "p1", label: "P1", linkId: "l1", t: 0.9, kind: "data", state: "flying" }] }],
    description: "Packet P1 serializes onto the wire as electrical/optical signals and travels to the intermediate switch at ~200,000 km/s.",
    codeLines: [4],
  });

  // Step 4: Switch store-and-forward + P2 serialization
  steps.push({
    panels: [{ id: "intro", label: "Network Communication", nodes: [nodes[0], { ...nodes[1], state: "active" }, nodes[2]], links: [links[0], { ...links[1], state: "active" }], packets: [{ id: "p1", label: "P1", linkId: "l2", t: 0.4, kind: "data", state: "flying" }, { id: "p2", label: "P2", linkId: "l1", t: 0.5, kind: "data", state: "flying" }] }],
    description: "The Switch receives P1, stores it in its FIFO buffer, inspects the destination MAC address, and forwards it to Bob. Simultaneously, Alice pushes P2 onto Link 1 (pipelined transmission).",
    codeLines: [5, 6],
  });

  if (cutId === "l2") {
    steps.push({
      panels: [{ id: "intro", label: "Network Communication", nodes: [nodes[0], { ...nodes[1], state: "active" }, { ...nodes[2], state: "failed" }], links: [links[0], { ...links[1], state: "down" }], packets: [{ id: "p1", label: "P1", linkId: "l2", t: 0.5, kind: "data", state: "dropped" }] }],
      description: "P1 leaves the switch for Bob, but Link 2 is severed. The frame drops in transit. Bob never receives the packet and no ACK is generated.",
      codeLines: [6],
      message: FAIL("Packet dropped on severed link to Bob"),
    });
    return {
      steps,
      title: "What Is a Network? — Packet Transmission",
      pseudocode: INTRO_CODE,
      stats: [{ label: "Status", value: "Partitioned", tone: "coral" }, { label: "Packets Lost", value: "3", tone: "coral" }],
    };
  }

  // Step 5: P1 arrives, P2 to switch, P3 leaves Alice
  steps.push({
    panels: [{ id: "intro", label: "Network Communication", nodes: [nodes[0], nodes[1], { ...nodes[2], state: "active" }], links: [{ ...links[0], state: "active" }, { ...links[1], state: "active" }], packets: [{ id: "p1", label: "P1", linkId: "l2", t: 1.0, kind: "data", state: "delivered" }, { id: "p2", label: "P2", linkId: "l2", t: 0.3, kind: "data", state: "flying" }, { id: "p3", label: "P3", linkId: "l1", t: 0.6, kind: "data", state: "flying" }] }],
    description: "Bob receives P1 and verifies the Frame Check Sequence (CRC-32). The payload 'HE' is placed in Bob's reassembly buffer.",
    codeLines: [7],
    strip: { label: "Bob's Buffer", chips: [{ text: "P1:HE", state: "matched" }] },
  });

  // Step 6: All packets arrived and reassembled
  steps.push({
    panels: [{ id: "intro", label: "Network Communication", nodes: [{ ...nodes[0], state: "idle" }, nodes[1], { ...nodes[2], state: "found" }], links: [...links], packets: [] }],
    description: "All 3 packets have arrived safely. Bob strips the headers, verifies sequencing (P1 + P2 + P3), and reconstructs the complete message 'HELLO' for the application layer.",
    codeLines: [7],
    strip: { label: "Reassembled Message", chips: [{ text: "H", state: "done" }, { text: "E", state: "done" }, { text: "L", state: "done" }, { text: "L", state: "done" }, { text: "O", state: "done" }] },
    message: OK("Message delivered & reassembled: 'HELLO'"),
  });

  return {
    steps,
    title: "What Is a Network? — End-to-End Packet Flow",
    pseudocode: INTRO_CODE,
    stats: [
      { label: "Payload", value: "5 Bytes", tone: "signal" },
      { label: "Packets", value: "3", tone: "amber" },
      { label: "Overhead", value: "192 Bytes", tone: "signal" },
      { label: "Outcome", value: "100% Delivered", tone: "mint" },
    ],
  };
}

// --- operations: Network Types (PAN, LAN, MAN, WAN, Scale Comparison) -------

const TYPE_CODE = [
  "identify scale: PAN (<10m) | LAN (<1km) | MAN (<50km) | WAN (>1000km)",
  "configure endpoints and intermediate routing infrastructure",
  "transmit data frame across physical domain",
  "observe propagation latency and hop-by-hop forwarding",
];

function typePan(): NetProgram {
  const steps: NetStep[] = [];
  const nodes: NetNode[] = [
    N("Phone", "Phone", "host", 50, 50),
    N("Watch", "Watch", "host", 28, 30),
    N("Buds", "Earbuds", "host", 72, 30),
    N("Laptop", "Laptop", "host", 30, 72),
    N("Scale", "Scale", "host", 70, 72),
  ];
  const links: NetLink[] = [
    L("l1", "Phone", "Watch"),
    L("l2", "Phone", "Buds"),
    L("l3", "Phone", "Laptop"),
    L("l4", "Phone", "Scale"),
  ];

  steps.push({
    panels: [{ id: "pan", label: "Personal Area Network (PAN)", sub: "Range: ~10m · Bluetooth 5.3 / Zigbee · Piconet", nodes: [...nodes], links: [...links], packets: [] }],
    description: "A Personal Area Network (PAN) interconnects devices centered around a single person within a typical range of 10 meters. The smartphone acts as the master node in a Bluetooth piconet.",
    codeLines: [1, 2],
  });

  steps.push({
    panels: [{ id: "pan", label: "Personal Area Network (PAN)", sub: "Audio & Sensor Sync Active", nodes: [{ ...nodes[0], state: "active" }, { ...nodes[1], state: "active" }, { ...nodes[2], state: "active" }, nodes[3], nodes[4]], links: [{ ...links[0], state: "active" }, { ...links[1], state: "active" }, links[2], links[3]], packets: [{ id: "p1", label: "HR", linkId: "l1", t: 0.6, kind: "data", state: "flying" }, { id: "p2", label: "Audio", linkId: "l2", t: 0.6, kind: "data", state: "flying" }] }],
    description: "Short-range 2.4 GHz ultra-low-power radio waves transmit biometric data from the smartwatch and high-definition audio to wireless earbuds with negligible latency (~2 ms).",
    codeLines: [3, 4],
    message: OK("BLE synchronized · 2 ms latency"),
  });

  return {
    steps,
    title: "Personal Area Network (PAN)",
    pseudocode: TYPE_CODE,
    stats: [
      { label: "Coverage", value: "< 10 meters", tone: "signal" },
      { label: "Technology", value: "BLE / Zigbee", tone: "amber" },
      { label: "Latency", value: "~2 ms", tone: "mint" },
      { label: "Data Rate", value: "1–24 Mbps", tone: "signal" },
    ],
  };
}

function typeLan(): NetProgram {
  const steps: NetStep[] = [];
  const nodes: NetNode[] = [
    N("PC1", "PC-1", "host", 20, 25),
    N("PC2", "PC-2", "host", 20, 75),
    N("SW", "L2 Switch", "switch", 50, 50),
    N("Printer", "Printer", "host", 80, 25),
    N("Server", "Server", "server", 80, 75),
  ];
  const links: NetLink[] = [
    L("l1", "PC1", "SW"),
    L("l2", "PC2", "SW"),
    L("l3", "SW", "Printer"),
    L("l4", "SW", "Server"),
  ];

  steps.push({
    panels: [{ id: "lan", label: "Local Area Network (LAN)", sub: "Range: ~100m–1km · 1 Gbps Ethernet / Wi-Fi 6", nodes: [...nodes], links: [...links], packets: [] }],
    description: "A Local Area Network (LAN) connects computers and peripherals within a localized geographical area like an office, school lab, or home. All devices share a single administrative domain.",
    codeLines: [1, 2],
  });

  steps.push({
    panels: [{ id: "lan", label: "Local Area Network (LAN)", sub: "Unicast Frame Forwarding", nodes: [{ ...nodes[0], state: "active" }, nodes[1], { ...nodes[2], state: "active" }, { ...nodes[3], state: "target" }, nodes[4]], links: [{ ...links[0], state: "active" }, links[1], { ...links[2], state: "active" }, links[3]], packets: [{ id: "p1", label: "PrintDoc", linkId: "l1", t: 0.8, kind: "data", state: "flying" }] }],
    description: "PC-1 sends a 1500-byte print frame to the Network Printer. The Layer 2 Switch checks its MAC address lookup table and forwards the frame only on the printer's port without broadcasting.",
    codeLines: [3, 4],
    message: OK("1 Gbps Ethernet · Dedicated switch bandwidth"),
  });

  return {
    steps,
    title: "Local Area Network (LAN)",
    pseudocode: TYPE_CODE,
    stats: [
      { label: "Coverage", value: "< 1 km", tone: "signal" },
      { label: "Bandwidth", value: "1–10 Gbps", tone: "signal" },
      { label: "Latency", value: "< 0.5 ms", tone: "mint" },
      { label: "Domain", value: "Single Broadcast", tone: "amber" },
    ],
  };
}

function typeMan(): NetProgram {
  const steps: NetStep[] = [];
  const nodes: NetNode[] = [
    N("CampusN", "North Campus", "router", 25, 25),
    N("Hospital", "City Hospital", "router", 75, 25),
    N("Govt", "Civic Center", "router", 25, 75),
    N("DataCenter", "Data Center", "server", 75, 75),
  ];
  const links: NetLink[] = [
    L("l1", "CampusN", "Hospital", true),
    L("l2", "Hospital", "DataCenter", true),
    L("l3", "DataCenter", "Govt", true),
    L("l4", "Govt", "CampusN", true),
  ];

  steps.push({
    panels: [{ id: "man", label: "Metropolitan Area Network (MAN)", sub: "Range: 5–50 km · City-wide Dark Fiber Optical Ring", nodes: [...nodes], links: [...links], packets: [] }],
    description: "A Metropolitan Area Network (MAN) spans an entire city or metropolitan region, interconnecting multiple branch offices, universities, and government buildings via high-speed optical fiber trunks.",
    codeLines: [1, 2],
  });

  steps.push({
    panels: [{ id: "man", label: "Metropolitan Area Network (MAN)", sub: "Inter-site Optical Transmission", nodes: [{ ...nodes[0], state: "active" }, nodes[1], nodes[2], { ...nodes[3], state: "target" }], links: [{ ...links[0], state: "active" }, { ...links[1], state: "active" }, links[2], links[3]], packets: [{ id: "p1", label: "Records", linkId: "l1", t: 0.9, kind: "data", state: "flying" }] }],
    description: "North Campus streams multi-gigabyte research datasets to the centralized City Data Center over high-capacity DWDM optical fiber rings with ~5 ms latency.",
    codeLines: [3, 4],
    message: OK("MAN 10 Gbps Metro Ring · 5 ms latency"),
  });

  return {
    steps,
    title: "Metropolitan Area Network (MAN)",
    pseudocode: TYPE_CODE,
    stats: [
      { label: "Coverage", value: "5–50 km (City)", tone: "signal" },
      { label: "Medium", value: "DWDM Fiber Ring", tone: "amber" },
      { label: "Latency", value: "2–10 ms", tone: "mint" },
      { label: "Bandwidth", value: "10–100 Gbps", tone: "signal" },
    ],
  };
}

function typeWan(): NetProgram {
  const steps: NetStep[] = [];
  const nodes: NetNode[] = [
    N("NYC", "New York", "router", 15, 45),
    N("LON", "London", "router", 40, 30),
    N("MUM", "Mumbai", "router", 65, 65),
    N("TYO", "Tokyo", "router", 88, 40),
  ];
  const links: NetLink[] = [
    L("l1", "NYC", "LON", true),
    L("l2", "LON", "MUM", true),
    L("l3", "MUM", "TYO", true),
    L("l4", "NYC", "TYO", true),
  ];

  steps.push({
    panels: [{ id: "wan", label: "Wide Area Network (WAN)", sub: "Range: Global (10,000+ km) · Undersea Cables & Satellite Links", nodes: [...nodes], links: [...links], packets: [] }],
    description: "A Wide Area Network (WAN) spans countries, continents, or the entire globe. The Internet is the world's largest public WAN, built from interconnected Autonomous Systems (ISPs).",
    codeLines: [1, 2],
  });

  steps.push({
    panels: [{ id: "wan", label: "Wide Area Network (WAN)", sub: "Transcontinental Routing via Submarine Fiber", nodes: [{ ...nodes[0], state: "active" }, { ...nodes[1], state: "visited" }, nodes[2], { ...nodes[3], state: "target" }], links: [{ ...links[0], state: "active" }, links[1], links[2], links[3]], packets: [{ id: "p1", label: "BGP-Packet", linkId: "l1", t: 0.8, kind: "data", state: "flying" }] }],
    description: "A packet leaves New York, crosses the Atlantic Ocean via transatlantic submarine fiber (6,000 km) to London, then routes onwards to Tokyo with ~150 ms round-trip propagation time.",
    codeLines: [3, 4],
    message: OK("Global WAN · Transoceanic propagation ~150 ms"),
  });

  return {
    steps,
    title: "Wide Area Network (WAN)",
    pseudocode: TYPE_CODE,
    stats: [
      { label: "Coverage", value: "Global / Multi-continent", tone: "signal" },
      { label: "Infrastructure", value: "Subsea Fiber / Satellite", tone: "amber" },
      { label: "Latency", value: "100–300 ms", tone: "coral" },
      { label: "Ownership", value: "Tier 1 ISPs / Public", tone: "signal" },
    ],
  };
}

function typeComparison(): NetProgram {
  const steps: NetStep[] = [];
  const pPan: NetPanel = {
    id: "p1",
    label: "1. PAN",
    sub: "< 10m · Bluetooth",
    nodes: [N("A", "Phone", "host", 50, 50), N("B", "Watch", "host", 50, 20)],
    links: [L("l1", "A", "B")],
    packets: [{ id: "p", label: "BLE", linkId: "l1", t: 0.6, kind: "data", state: "flying" }],
  };
  const pLan: NetPanel = {
    id: "p2",
    label: "2. LAN",
    sub: "< 1km · Switch",
    nodes: [N("A", "PC", "host", 25, 50), N("S", "SW", "switch", 50, 50), N("B", "Server", "server", 75, 50)],
    links: [L("l1", "A", "S"), L("l2", "S", "B")],
    packets: [{ id: "p", label: "Eth", linkId: "l2", t: 0.6, kind: "data", state: "flying" }],
  };
  const pMan: NetPanel = {
    id: "p3",
    label: "3. MAN",
    sub: "5–50km · City Fiber",
    nodes: [N("A", "Site A", "router", 25, 30), N("B", "Site B", "router", 75, 70)],
    links: [L("l1", "A", "B", true)],
    packets: [{ id: "p", label: "Fiber", linkId: "l1", t: 0.6, kind: "data", state: "flying" }],
  };
  const pWan: NetPanel = {
    id: "p4",
    label: "4. WAN",
    sub: "Global · Subsea",
    nodes: [N("A", "NYC", "router", 20, 50), N("B", "London", "router", 80, 50)],
    links: [L("l1", "A", "B", true)],
    packets: [{ id: "p", label: "WAN", linkId: "l1", t: 0.6, kind: "data", state: "flying" }],
  };

  steps.push({
    panels: [pPan, pLan, pMan, pWan],
    description: "Zooming out from a personal workspace to the whole planet: Geographic radius increases by 6 orders of magnitude ($10^1\\text{ m} \\to 10^7\\text{ m}$), latency jumps from 1 ms to 200 ms, and network ownership shifts from private to global telecom consortiums.",
    codeLines: [1, 2, 3, 4],
    message: OK("PAN vs LAN vs MAN vs WAN scale comparison"),
  });

  return {
    steps,
    title: "Network Scale Comparison: PAN to WAN",
    pseudocode: TYPE_CODE,
    stats: [
      { label: "PAN", value: "<10m · 2ms", tone: "signal" },
      { label: "LAN", value: "<1km · 0.5ms", tone: "mint" },
      { label: "MAN", value: "50km · 5ms", tone: "amber" },
      { label: "WAN", value: "Global · 150ms", tone: "coral" },
    ],
  };
}

// --- operations: Switching Techniques ---------------------------------------

const SWITCH_CODE = [
  "-- CIRCUIT SWITCHING --",
  "1. Setup Phase: reserve end-to-end dedicated channel",
  "2. Data Phase: stream bits continuously (no headers/queuing)",
  "3. Teardown Phase: release physical channel capacity",
  "",
  "-- PACKET SWITCHING --",
  "1. Chop message into packets with headers (Src, Dst, Seq)",
  "2. Forward hop-by-hop across dynamically chosen routes",
  "3. Reassemble in buffer upon destination arrival",
];

function switchCircuit(): NetProgram {
  const steps: NetStep[] = [];
  const nodes: NetNode[] = [
    N("Src", "Caller", "host", 12, 50),
    N("S1", "SW-1", "switch", 35, 30),
    N("S2", "SW-2", "switch", 35, 70),
    N("S3", "SW-3", "switch", 65, 30),
    N("S4", "SW-4", "switch", 65, 70),
    N("Dst", "Receiver", "host", 88, 50),
  ];
  const links: NetLink[] = [
    L("l1", "Src", "S1"),
    L("l2", "Src", "S2"),
    L("l3", "S1", "S3"),
    L("l4", "S2", "S4"),
    L("l5", "S3", "Dst"),
    L("l6", "S4", "Dst"),
  ];

  // Phase 1: Setup Probe
  steps.push({
    panels: [{ id: "circ", label: "Circuit Switching — Phase 1: Call Setup", sub: "Establishing Dedicated Physical Channel", nodes: [{ ...nodes[0], state: "active" }, nodes[1], nodes[2], nodes[3], nodes[4], nodes[5]], links: [...links], packets: [{ id: "setup", label: "SETUP", linkId: "l1", t: 0.8, kind: "control", state: "flying" }] }],
    description: "Phase 1 (Circuit Setup): The caller sends a setup probe across the switch matrix to find and reserve dedicated physical bandwidth along path Src → SW-1 → SW-3 → Dst.",
    codeLines: [1, 2],
  });

  // Phase 2: Channel Reserved
  const resLinks: NetLink[] = [
    { ...links[0], state: "reserved" },
    links[1],
    { ...links[2], state: "reserved" },
    links[3],
    { ...links[4], state: "reserved" },
    links[5],
  ];
  steps.push({
    panels: [{ id: "circ", label: "Circuit Switching — Phase 2: Continuous Data Stream", sub: "Locked Channel: 100% Dedicated Bandwidth", nodes: [{ ...nodes[0], state: "found" }, { ...nodes[1], state: "active" }, nodes[2], { ...nodes[3], state: "active" }, nodes[4], { ...nodes[5], state: "found" }], links: resLinks, packets: [{ id: "s1", label: "STREAM", linkId: "l3", t: 0.5, kind: "data", state: "flying" }] }],
    description: "Phase 2 (Data Transfer): With the circuit locked, data streams continuously with zero header overhead and zero queue jitter. However, if the caller pauses, the reserved capacity sits 100% idle and wasted.",
    codeLines: [3],
    message: OK("Dedicated 64 kbps circuit active · Zero jitter"),
  });

  // Phase 3: Teardown
  steps.push({
    panels: [{ id: "circ", label: "Circuit Switching — Phase 3: Teardown", sub: "Release Channel Resources", nodes: [...nodes], links: [...links], packets: [{ id: "rel", label: "RELEASE", linkId: "l5", t: 0.8, kind: "control", state: "flying" }] }],
    description: "Phase 3 (Teardown): Once transmission concludes, a RELEASE control signal tears down the reserved circuit, freeing switch cross-connect capacity for other callers.",
    codeLines: [4],
  });

  return {
    steps,
    title: "Circuit Switching (3-Phase Connection)",
    pseudocode: SWITCH_CODE,
    stats: [
      { label: "Reservation", value: "Dedicated", tone: "amber" },
      { label: "Header Overhead", value: "0% in data phase", tone: "mint" },
      { label: "Jitter", value: "0 ms (Constant)", tone: "mint" },
      { label: "Bandwidth Waste", value: "High on bursty data", tone: "coral" },
    ],
  };
}

function switchPacket(): NetProgram {
  const steps: NetStep[] = [];
  const nodes: NetNode[] = [
    N("Src", "Sender", "host", 12, 50),
    N("R1", "Router 1", "router", 35, 30),
    N("R2", "Router 2", "router", 35, 70),
    N("R3", "Router 3", "router", 65, 30),
    N("R4", "Router 4", "router", 65, 70),
    N("Dst", "Receiver", "host", 88, 50),
  ];
  const links: NetLink[] = [
    L("l1", "Src", "R1"),
    L("l2", "Src", "R2"),
    L("l3", "R1", "R3"),
    L("l4", "R2", "R4"),
    L("l5", "R3", "Dst"),
    L("l6", "R4", "Dst"),
    L("l7", "R1", "R4"),
  ];

  steps.push({
    panels: [{ id: "pkt", label: "Packet Switching (Datagram / Statistical Multiplexing)", sub: "Dynamic Route Diversity & Store-and-Forward", nodes: [{ ...nodes[0], state: "active" }, nodes[1], nodes[2], nodes[3], nodes[4], nodes[5]], links: [...links], packets: [] }],
    description: "In packet switching, the message is divided into independent packets (P1, P2, P3, P4). No connection setup is required. Each packet carries destination routing metadata.",
    codeLines: [6, 7],
    strip: { label: "Sender Buffer", chips: [{ text: "P1", state: "active" }, { text: "P2", state: "active" }, { text: "P3", state: "active" }, { text: "P4", state: "active" }] },
  });

  steps.push({
    panels: [{ id: "pkt", label: "Packet Switching", sub: "Dynamic Multi-Path Forwarding", nodes: [nodes[0], { ...nodes[1], state: "active" }, { ...nodes[2], state: "active" }, nodes[3], nodes[4], nodes[5]], links: [{ ...links[0], state: "active" }, { ...links[1], state: "active" }, links[2], links[3], links[4], links[5], links[6]], packets: [{ id: "p1", label: "P1", linkId: "l1", t: 0.9, kind: "data", state: "flying" }, { id: "p2", label: "P2", linkId: "l2", t: 0.5, kind: "data", state: "flying" }] }],
    description: "Packets take divergent paths based on real-time link availability: P1 routes via Router 1 (top path), while P2 routes via Router 2 (bottom path). Statistical multiplexing maximizes wire efficiency.",
    codeLines: [8],
  });

  steps.push({
    panels: [{ id: "pkt", label: "Packet Switching", sub: "Out-of-Order Arrival & Reassembly", nodes: [nodes[0], nodes[1], nodes[2], nodes[3], nodes[4], { ...nodes[5], state: "found" }], links: [...links], packets: [{ id: "p2", label: "P2", linkId: "l6", t: 1.0, kind: "data", state: "delivered" }, { id: "p1", label: "P1", linkId: "l5", t: 0.8, kind: "data", state: "flying" }] }],
    description: "Packet P2 arrives before P1 due to lower congestion on the bottom route! The receiver buffers P2, waits for P1, and reassembles them in correct numerical order using sequence numbers.",
    codeLines: [9],
    strip: { label: "Receiver Reassembly", chips: [{ text: "P2 (Waiting for P1)", state: "pending" }] },
    message: OK("Reassembled in order: [P1, P2, P3, P4]"),
  });

  return {
    steps,
    title: "Packet Switching (Statistical Multiplexing)",
    pseudocode: SWITCH_CODE,
    stats: [
      { label: "Connection Setup", value: "0 ms (None)", tone: "mint" },
      { label: "Link Sharing", value: "Statistical Multiplexing", tone: "signal" },
      { label: "Routing", value: "Dynamic Per-Packet", tone: "amber" },
      { label: "Efficiency", value: "High on Bursty Traffic", tone: "mint" },
    ],
  };
}

function switchComparison(): NetProgram {
  const steps: NetStep[] = [];
  const pCirc: NetPanel = {
    id: "circ",
    label: "Circuit Switching",
    sub: "Setup penalty + locked path",
    nodes: [N("A1", "A", "host", 20, 50), N("S1", "SW", "switch", 50, 50), N("B1", "B", "host", 80, 50)],
    links: [{ id: "l1", from: "A1", to: "S1", state: "reserved" }, { id: "l2", from: "S1", to: "B1", state: "reserved" }],
    packets: [{ id: "p1", label: "Stream", linkId: "l2", t: 0.7, kind: "data", state: "flying" }],
  };
  const pPkt: NetPanel = {
    id: "pkt",
    label: "Packet Switching",
    sub: "Instant start + shared wire",
    nodes: [N("A2", "A", "host", 20, 50), N("R1", "Router", "router", 50, 50), N("B2", "B", "host", 80, 50)],
    links: [{ id: "l1", from: "A2", to: "R1", state: "active" }, { id: "l2", from: "R1", to: "B2", state: "active" }],
    packets: [{ id: "p2", label: "P1", linkId: "l2", t: 0.4, kind: "data", state: "flying" }, { id: "p3", label: "P2", linkId: "l1", t: 0.6, kind: "data", state: "flying" }],
  };

  steps.push({
    panels: [pCirc, pPkt],
    description: "Circuit Switching wins on continuous streams (voice calls) because zero headers and zero router queuing occur after setup. Packet Switching wins on typical bursty Internet traffic because multiple users share the wire dynamically without pre-allocation waste.",
    codeLines: [1, 2, 3, 5, 6, 7, 8, 9],
    message: OK("Circuit: guaranteed QoS · Packet: 3.8x higher efficiency"),
  });

  return {
    steps,
    title: "Circuit Switching vs Packet Switching Race",
    pseudocode: SWITCH_CODE,
    stats: [
      { label: "Circuit Setup", value: "Required", tone: "coral" },
      { label: "Packet Setup", value: "Zero Delay", tone: "mint" },
      { label: "Wire Utilization", value: "3.8× for Packet", tone: "mint" },
      { label: "Internet Choice", value: "Packet Switching", tone: "signal" },
    ],
  };
}

// --- public surface ---------------------------------------------------------

export type NetOp =
  | "introNetwork"
  | "typePan"
  | "typeLan"
  | "typeMan"
  | "typeWan"
  | "typeComparison"
  | "topoBus"
  | "topoStar"
  | "topoRing"
  | "topoMesh"
  | "topoHybrid"
  | "topoFailure"
  | "switchCircuit"
  | "switchPacket"
  | "switchComparison";

const TOPO_FOR: Record<string, TopoId> = {
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
  if (!(op in TOPO_FOR)) return null;
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

/**
 * Timeline labels and Predict questions for the hand-scripted lessons, whose
 * frames are a fixed sequence. (Topologies build theirs inline, because their
 * frame count depends on the student's inputs.)
 */
function scripted(op: NetOp, prog: NetProgram, cutId: string | null): NetProgram {
  const s = prog.steps;
  switch (op) {
    case "introNetwork": {
      const dropped = s[s.length - 1].message?.tone === "error";
      const packets = ask(
        "Alice's NIC splits 'HELLO' into packets of at most 2 bytes of data. How many packets?",
        "3",
        ["1", "2", "5"],
        "HE + LL + O — the last packet is simply shorter. Each one gets its own header, which is where the overhead comes from.",
        2,
      );
      if (dropped) {
        const which = cutId === "l1" ? "Alice–Switch" : "Switch–Bob";
        tag(s, ["message", "packetise", ...(cutId === "l1" ? [] : ["P1 → SW", "forward"]), "✕ drop"], {
          1: packets,
          [s.length - 1]: ask(
            `The ${which} wire is cut. What happens to P1?`,
            "It is lost — nothing retries at this layer",
            ["The switch holds it until the wire is fixed", "It takes another path", "Bob asks for it again straight away"],
            "There is only one path and no one below the transport layer keeps a copy, so the packet simply dies on the wire.",
            1,
          ),
        });
      } else {
        tag(s, ["message", "packetise", "P1 → SW", "forward", "P1 ✓", "HELLO"], {
          1: packets,
          3: ask(
            "P1 reaches the switch. What does the switch read to pick the output port?",
            "The destination MAC address",
            ["The destination IP address", "The payload 'HE'", "The sequence number"],
            "A switch is a layer-2 device: it looks the destination MAC up in its MAC table and sends the frame out of that one port.",
            3,
          ),
          5: ask(
            "P2 could arrive before P1. How does Bob put 'HELLO' back in order?",
            "By the sequence numbers in the headers",
            ["By arrival time", "The switch reorders them", "He can't — the message is garbled"],
            "Every packet carries Seq: i, so Bob can buffer early arrivals and slot them into place.",
            0,
          ),
        });
      }
      break;
    }
    case "typePan":
      tag(s, ["piconet", "sync"], {
        1: ask(
          "Roughly how far apart can devices in a PAN be?",
          "About 10 m",
          ["About 1 km", "About 50 km", "Across a country"],
          "A PAN is built around one person — Bluetooth and Zigbee are designed for around 10 m.",
          1,
        ),
      });
      break;
    case "typeLan":
      tag(s, ["LAN", "unicast"], {
        1: ask(
          "PC-1 sends a print job to the printer. Which ports does the switch send it out of?",
          "Only the printer's port",
          ["Every port", "Every port except PC-1's", "The server's and the printer's"],
          "Once the switch has learned the printer's MAC it forwards to that port alone — that is what makes a switch better than a hub.",
          2,
        ),
      });
      break;
    case "typeMan":
      tag(s, ["MAN", "metro"], {
        1: ask(
          "What usually carries traffic between the sites of a MAN?",
          "A fibre ring across the city",
          ["Bluetooth", "A single Ethernet switch", "Satellite links"],
          "A MAN spans 5–50 km, so sites are joined by high-capacity optical fibre, often laid as a ring for redundancy.",
          0,
        ),
      });
      break;
    case "typeWan":
      tag(s, ["WAN", "ocean"], {
        1: ask(
          "New York to Tokyo and back over submarine fibre. Roughly what round-trip time?",
          "About 150 ms",
          ["About 2 ms", "About 15 ms", "About 3 s"],
          "Light in fibre covers roughly 200 km per ms, and the round trip is tens of thousands of km — distance alone costs over 100 ms.",
          3,
        ),
      });
      break;
    case "typeComparison":
      tag(s, ["scale"]);
      break;
    case "switchCircuit":
      tag(s, ["setup", "stream", "teardown"], {
        1: ask(
          "The circuit is reserved. What happens to its capacity when the caller stops talking?",
          "It stays reserved — and wasted",
          ["Other callers borrow it", "The circuit tears down automatically", "It speeds up the other calls"],
          "A circuit is dedicated end to end for the whole call, whether or not anything is being sent. That is its big weakness for bursty data.",
          1,
        ),
      });
      break;
    case "switchPacket":
      tag(s, ["split", "two paths", "reassemble"], {
        2: ask(
          "P2 took the quieter bottom path. In what order do P1 and P2 reach the receiver?",
          "P2 first, then P1",
          ["P1 first, then P2", "Together", "Only P1 arrives"],
          "Each packet is routed on its own, so packets can overtake each other. The receiver reorders them by sequence number.",
          0,
        ),
      });
      break;
    case "switchComparison":
      tag(s, ["race"]);
      break;
  }
  return prog;
}

export function runNetOperation(p: NetRunParams): NetProgram {
  const linkDown = p.faults.find((f) => f.kind === "linkDown");
  const cutId = linkDown && "id" in linkDown ? linkDown.id : null;

  switch (p.op) {
    case "introNetwork":
      return scripted(p.op, introNetwork(cutId), cutId);
    case "typePan":
      return scripted(p.op, typePan(), cutId);
    case "typeLan":
      return scripted(p.op, typeLan(), cutId);
    case "typeMan":
      return scripted(p.op, typeMan(), cutId);
    case "typeWan":
      return scripted(p.op, typeWan(), cutId);
    case "typeComparison":
      return scripted(p.op, typeComparison(), cutId);
    case "switchCircuit":
      return scripted(p.op, switchCircuit(), cutId);
    case "switchPacket":
      return scripted(p.op, switchPacket(), cutId);
    case "switchComparison":
      return scripted(p.op, switchComparison(), cutId);
    case "topoFailure": {
      const hosts = Math.max(MIN_HOSTS, Math.min(MAX_HOSTS, p.hosts));
      const ids = HOST_IDS.slice(0, hosts);
      const from = ids.includes(p.from) ? p.from : ids[0];
      const to = ids.includes(p.to) ? p.to : ids[ids.length - 2] ?? ids[ids.length - 1];
      return topoFailure(from, to, hosts);
    }
    default: {
      const hosts = Math.max(MIN_HOSTS, Math.min(MAX_HOSTS, p.hosts));
      const ids = HOST_IDS.slice(0, hosts);
      const from = ids.includes(p.from) ? p.from : ids[0];
      const to = ids.includes(p.to) ? p.to : ids[ids.length - 2] ?? ids[ids.length - 1];
      const spec = BUILDERS[TOPO_FOR[p.op]](hosts);
      const valid = cutId && spec.links.some((l) => l.id === cutId) ? cutId : null;
      return singleTopo(spec, from, to, valid);
    }
  }
}

export const NET_OPERATIONS: { id: NetOp; label: string; icon: string; subpath: string }[] = [
  { id: "introNetwork", label: "Intro", icon: "share", subpath: "introduction/what-is-a-network" },
  { id: "typePan", label: "PAN", icon: "watch", subpath: "network-types/pan" },
  { id: "typeLan", label: "LAN", icon: "home_work", subpath: "network-types/lan" },
  { id: "typeMan", label: "MAN", icon: "location_city", subpath: "network-types/man" },
  { id: "typeWan", label: "WAN", icon: "public", subpath: "network-types/wan" },
  { id: "typeComparison", label: "Scale", icon: "zoom_out_map", subpath: "network-types/scale-comparison" },
  { id: "topoBus", label: "Bus", icon: "horizontal_rule", subpath: "topologies/bus" },
  { id: "topoStar", label: "Star", icon: "star", subpath: "topologies/star" },
  { id: "topoRing", label: "Ring", icon: "radio_button_unchecked", subpath: "topologies/ring" },
  { id: "topoMesh", label: "Mesh", icon: "hub", subpath: "topologies/mesh" },
  { id: "topoHybrid", label: "Hybrid", icon: "account_tree", subpath: "topologies/hybrid" },
  { id: "topoFailure", label: "Failure", icon: "link_off", subpath: "topologies/failure-comparison" },
  { id: "switchCircuit", label: "Circuit", icon: "settings_input_component", subpath: "switching/circuit-switching" },
  { id: "switchPacket", label: "Packet", icon: "grid_view", subpath: "switching/packet-switching" },
  { id: "switchComparison", label: "Circuit vs Packet", icon: "compare_arrows", subpath: "switching/circuit-vs-packet" },
];

export type { CellState };

