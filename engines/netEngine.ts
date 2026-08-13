// ---------------------------------------------------------------------------
// netEngine — nodes, links and packets.
//
// Pure functions only. `run` compiles an operation into a flat NetProgram of
// frames; the player just walks them. No React, no timers, no unseeded
// randomness — that is what makes playback scrubbable and replayable.
//
// Everything here is built on ONE idea: five topologies made of the same six
// hosts. Swap the wiring, keep the endpoints, and the differences between bus,
// star, ring, mesh and hybrid become observable instead of memorized.
// ---------------------------------------------------------------------------

import type {
  CellState,
  Fault,
  FaultOption,
  NetLink,
  NetNode,
  NetPanel,
  NetProgram,
  NetStep,
  NodeKind,
  Packet,
  StepMessage,
} from "@/types/visualization";

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

/**
 * A topology, plus everything the demo needs to know about how it breaks.
 * `route` is the healthy A→E path; `cutId` is the link we sever; `detour` is
 * the path that still works afterwards, or null if the network partitions.
 */
interface TopoSpec {
  id: string;
  label: string;
  sub: string;
  nodes: NetNode[];
  links: NetLink[];
  route: string[];
  cutId: string;
  detour: string[] | null;
  /** Why it survives / why it dies — the sentence that earns the animation. */
  why: string;
  spof: string;
}

// Six hosts on a circle — shared by star, ring and mesh so the eye can compare
// wiring rather than layout.
const RING_POS: [string, number, number][] = [
  ["A", 50, 12],
  ["B", 83, 31],
  ["C", 83, 71],
  ["D", 50, 90],
  ["E", 17, 71],
  ["F", 17, 31],
];

const hosts = (pos: [string, number, number][]) =>
  pos.map(([id, x, y]) => N(id, id, "host", x, y));

// --- the five topologies ----------------------------------------------------

function bus(): TopoSpec {
  const xs = [9, 25, 41, 57, 73, 89];
  const ids = ["A", "B", "C", "D", "E", "F"];
  const nodes = [
    ...ids.map((id, i) => N(id, id, "host", xs[i], 22)),
    ...ids.map((id, i) => N(`t${id}`, "", "tap", xs[i], 68)),
  ];
  const links = [
    ...ids.map((id) => L(`d${id}`, id, `t${id}`)),
    ...ids.slice(0, -1).map((id, i) => L(`s${i}`, `t${id}`, `t${ids[i + 1]}`, true)),
  ];
  return {
    id: "bus",
    label: "Bus",
    sub: "one shared backbone",
    nodes,
    links,
    // A → tap → along the spine → tap → E
    route: ["dA", "s0", "s1", "s2", "s3", "dE"],
    cutId: "s2",
    detour: null,
    why: "The backbone itself is the network. Sever it in the middle and there is no second path — the bus becomes two separate networks that cannot hear each other.",
    spof: "the backbone",
  };
}

function star(): TopoSpec {
  const nodes = [...hosts(RING_POS), N("SW", "SW", "switch", 50, 51)];
  const links = RING_POS.map(([id]) => L(`s${id}`, id, "SW"));
  return {
    id: "star",
    label: "Star",
    sub: "every host owns its own link to the hub",
    nodes,
    links,
    route: ["sA", "sE"],
    cutId: "sE",
    detour: null,
    why: "A cut spoke isolates exactly one host — everyone else keeps talking, which is why star is the topology real offices use. The catch is the middle: kill the hub and all six die at once.",
    spof: "the central switch",
  };
}

function ring(): TopoSpec {
  const ids = ["A", "B", "C", "D", "E", "F"];
  const links = ids.map((id, i) => L(`r${i}`, id, ids[(i + 1) % 6]));
  return {
    id: "ring",
    label: "Ring",
    sub: "a closed loop — two ways round",
    nodes: hosts(RING_POS),
    links,
    // Shortest way from A to E is backwards round the ring: A → F → E.
    route: ["r5", "r4"],
    cutId: "r4",
    // With E–F gone, go the long way: A → B → C → D → E.
    detour: ["r0", "r1", "r2", "r3"],
    why: "A ring has two directions, so a single break just turns the loop into a line — traffic reverses and takes the long way round. It survives one cut. A second cut anywhere else splits it in two.",
    spof: "any second link",
  };
}

function mesh(): TopoSpec {
  const ids = ["A", "B", "C", "D", "E", "F"];
  const links: NetLink[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      links.push(L(`m${ids[i]}${ids[j]}`, ids[i], ids[j]));
    }
  }
  return {
    id: "mesh",
    label: "Mesh",
    sub: "every host wired to every other — 15 links",
    nodes: hosts(RING_POS),
    links,
    route: ["mAE"],
    cutId: "mAE",
    detour: ["mAB", "mBE"],
    why: "Full mesh pays for redundancy up front: 15 links for 6 hosts. Losing the direct A–E link costs one extra hop, nothing more. You would need to cut all five of A's links to silence it.",
    spof: "none",
  };
}

function hybrid(): TopoSpec {
  const nodes = [
    N("A", "A", "host", 9, 30),
    N("B", "B", "host", 30, 16),
    N("C", "C", "host", 45, 32),
    N("D", "D", "host", 55, 32),
    N("E", "E", "host", 70, 16),
    N("F", "F", "host", 91, 30),
    N("SW1", "SW1", "switch", 30, 66),
    N("SW2", "SW2", "switch", 70, 66),
  ];
  const links = [
    L("hA", "A", "SW1"),
    L("hB", "B", "SW1"),
    L("hC", "C", "SW1"),
    L("hD", "D", "SW2"),
    L("hE", "E", "SW2"),
    L("hF", "F", "SW2"),
    L("trunk", "SW1", "SW2", true),
  ];
  return {
    id: "hybrid",
    label: "Hybrid",
    sub: "two stars joined by a trunk",
    nodes,
    links,
    route: ["hA", "trunk", "hE"],
    cutId: "trunk",
    detour: null,
    why: "Each star keeps working internally — A can still reach B and C. But the trunk joining them carries every cross-star conversation, so cutting it splits the site into two islands that each work perfectly and cannot reach each other.",
    spof: "the trunk between the stars",
  };
}

const SPECS = [bus, star, ring, mesh, hybrid];

// --- frame assembly ---------------------------------------------------------

interface PanelOpts {
  cut: boolean;
  /** Which hop the packet is on. -1 = not sent yet. >= path.length = arrived. */
  hop: number;
  dim?: boolean;
  spotlight?: boolean;
  verdict?: StepMessage;
}

/** The path a frame actually attempts, and where (if anywhere) it dies. */
function attempt(spec: TopoSpec, cut: boolean): { path: string[]; dropIdx: number | null } {
  if (!cut) return { path: spec.route, dropIdx: null };
  if (spec.detour) return { path: spec.detour, dropIdx: null };
  // No alternate path: the frame walks its usual route until it meets the cut.
  return { path: spec.route, dropIdx: spec.route.indexOf(spec.cutId) };
}

function buildPanel(spec: TopoSpec, o: PanelOpts): NetPanel {
  const { path, dropIdx } = attempt(spec, o.cut);
  const nodes = spec.nodes.map((n) => ({ ...n }));
  const links = spec.links.map((l) => ({ ...l }));
  const byId = new Map(links.map((l) => [l.id, l]));
  const packets: Packet[] = [];

  if (o.cut) {
    const cutLink = byId.get(spec.cutId);
    if (cutLink) cutLink.state = "down";
  }

  // Endpoints are always visible as the story's subject and object.
  const A = nodes.find((n) => n.id === "A")!;
  const E = nodes.find((n) => n.id === "E")!;
  A.ring = true;
  E.ring = true;
  E.state = "target";

  if (o.hop >= 0) {
    const died = dropIdx !== null && o.hop >= dropIdx;
    const reached = dropIdx === null && o.hop >= path.length;
    const travelled = died ? dropIdx : Math.min(o.hop, path.length);

    // Light the wire behind the packet so the route it took stays readable.
    for (let i = 0; i < travelled; i++) {
      const l = byId.get(path[i]);
      if (l && l.state !== "down") l.state = "reserved";
    }
    for (const id of path.slice(0, travelled)) {
      const l = byId.get(id);
      if (!l) continue;
      for (const end of [l.from, l.to]) {
        const n = nodes.find((x) => x.id === end);
        if (n && n.state === "idle") n.state = "visited";
      }
    }

    if (died) {
      const l = byId.get(path[dropIdx!])!;
      packets.push({ id: "p", label: "A→E", linkId: l.id, t: 0.42, kind: "data", state: "dropped" });
      for (const end of [l.from, l.to]) {
        const n = nodes.find((x) => x.id === end);
        if (n) n.state = "failed";
      }
      A.state = "active";
    } else if (reached) {
      packets.push({
        id: "p",
        label: "A→E",
        linkId: path[path.length - 1],
        t: 1,
        kind: "data",
        state: "delivered",
      });
      E.state = "found";
      A.state = "visited";
    } else {
      const l = byId.get(path[o.hop])!;
      l.state = "active";
      packets.push({ id: "p", label: "A→E", linkId: l.id, t: 0.5, kind: "data", state: "flying" });
      A.state = "active";
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

// --- operation: topoFailure (the flagship) ----------------------------------

const FAILURE_CODE = [
  "for each topology T in {bus, star, ring, mesh, hybrid}:",
  "    wire the SAME six hosts A..F",
  "    send FRAME from A to E",
  "    observe: every topology delivers",
  "",
  "cut exactly ONE link in each topology",
  "",
  "for each topology T:",
  "    send FRAME from A to E again",
  "    if an alternate path still exists:",
  "        reroute, deliver          -- redundancy",
  "    else:",
  "        drop -- the network is partitioned",
];

function topoFailure(): NetProgram {
  const specs = SPECS.map((f) => f());
  const steps: NetStep[] = [];

  const frame = (
    o: (s: TopoSpec) => PanelOpts,
    description: string,
    codeLines: number[],
    message?: StepMessage,
  ) => {
    steps.push({ panels: specs.map((s) => buildPanel(s, o(s))), description, codeLines, message });
  };

  // Phase 1 — healthy.
  frame(
    () => ({ cut: false, hop: -1 }),
    "The same six hosts, wired five different ways. A wants to send one frame to E. Watch how differently that journey looks before anything is broken.",
    [1, 2],
  );

  const maxHealthy = Math.max(...specs.map((s) => s.route.length));
  for (let h = 0; h < maxHealthy; h++) {
    const arrived = specs.filter((s) => h >= s.route.length).map((s) => s.label);
    frame(
      () => ({ cut: false, hop: h }),
      h === 0
        ? "A transmits. Mesh has a direct link to E and is already done; the bus has to cross the whole backbone."
        : `Hop ${h + 1}. ${arrived.length ? `${arrived.join(", ")} already delivered — the hop count is the topology's real cost.` : "The frame moves one link closer."}`,
      [3],
    );
  }

  frame(
    (s) => ({ cut: false, hop: s.route.length, verdict: OK(`delivered · ${s.route.length} hop${s.route.length > 1 ? "s" : ""}`) }),
    "All five delivered. On a healthy network every topology looks equally good — which is exactly why topology choice looks like an arbitrary decision until something breaks.",
    [4],
    OK("5 / 5 delivered — no failures yet"),
  );

  // Phase 2 — one cut each.
  frame(
    (s) => ({ cut: true, hop: -1 }),
    "Now cut exactly one link in each — marked in red. One link. Not a device, not a power cut. The single most ordinary failure a network suffers.",
    [6],
    { text: "1 link severed in each topology", tone: "warn" },
  );

  const maxCut = Math.max(...specs.map((s) => attempt(s, true).path.length));
  for (let h = 0; h < maxCut; h++) {
    frame(
      () => ({ cut: true, hop: h }),
      h === 0
        ? "A transmits again. The frames that are about to die have not noticed anything yet — a sender cannot see a break further down the path."
        : `Hop ${h + 1}. Ring is walking the long way round; mesh took one detour hop. The other three have already hit the cut.`,
      [8, 9],
    );
  }

  frame(
    (s) => ({
      cut: true,
      hop: maxCut,
      verdict: s.detour
        ? OK(`rerouted · ${s.detour.length} hops`)
        : FAIL("dropped · no path"),
    }),
    "Two survived, three did not — and each of the three failed for a completely different structural reason. That difference is the whole point of studying topology.",
    [10, 11, 12, 13],
    { text: "2 / 5 survived — ring and mesh rerouted", tone: "warn" },
  );

  // Phase 3 — narrate each in turn.
  for (const spec of specs) {
    const survived = !!spec.detour;
    steps.push({
      panels: specs.map((s) =>
        buildPanel(s, {
          cut: true,
          hop: maxCut,
          dim: s.id !== spec.id,
          spotlight: s.id === spec.id,
          verdict:
            s.id !== spec.id
              ? undefined
              : survived
                ? OK(`rerouted · ${s.detour!.length} hops`)
                : FAIL("dropped · no path"),
        }),
      ),
      description: `${spec.label}: ${spec.why}`,
      codeLines: survived ? [10, 11] : [12, 13],
      message: survived
        ? OK(`${spec.label} survives — single point of failure: ${spec.spof}`)
        : FAIL(`${spec.label} partitioned — single point of failure: ${spec.spof}`),
    });
  }

  // Phase 4 — the takeaway.
  steps.push({
    panels: specs.map((s) =>
      buildPanel(s, {
        cut: true,
        hop: maxCut,
        verdict: s.detour ? OK("survived") : FAIL("partitioned"),
      }),
    ),
    description:
      "Redundancy is the only thing that separates them. Mesh buys it with 15 links, ring gets it free from its loop, and bus, star and hybrid each concentrate the whole network's fate into one cable. Cost, resilience — pick two.",
    codeLines: [10, 11, 12, 13],
    message: OK("Survivors: ring (two directions) and mesh (alternate links)"),
  });

  return {
    steps,
    title: "Topology Failure — cut one link in each",
    pseudocode: FAILURE_CODE,
    stats: [
      { label: "Topologies", value: "5", tone: "signal" },
      { label: "Links cut", value: "5", tone: "coral" },
      { label: "Survived", value: "2 / 5", tone: "mint" },
    ],
  };
}

// --- operation: a single topology -------------------------------------------

const SINGLE_CODE = [
  "wire six hosts A..F in this topology",
  "send FRAME from A to E",
  "for each link on the path:",
  "    forward the frame one hop",
  "deliver to E",
  "",
  "-- fault injected --",
  "cut the link and send again",
  "if an alternate path exists: reroute",
  "else: drop -- network partitioned",
];

function singleTopo(spec: TopoSpec, faults: Fault[]): NetProgram {
  const steps: NetStep[] = [];
  const cutRequested = faults.some((f) => f.kind === "linkDown");

  const push = (o: PanelOpts, description: string, codeLines: number[], message?: StepMessage) =>
    steps.push({ panels: [buildPanel(spec, o)], description, codeLines, message });

  push(
    { cut: false, hop: -1 },
    `${spec.label} topology: ${spec.sub}. Six hosts, ${spec.links.length} links. A is about to send one frame to E.`,
    [1],
  );

  for (let h = 0; h < spec.route.length; h++) {
    push(
      { cut: false, hop: h },
      h === 0
        ? "A puts the frame on the wire."
        : `Hop ${h + 1} of ${spec.route.length} — the frame moves one link closer to E.`,
      [3, 4],
    );
  }

  push(
    { cut: false, hop: spec.route.length, verdict: OK(`delivered · ${spec.route.length} hops`) },
    `Delivered in ${spec.route.length} hop${spec.route.length > 1 ? "s" : ""}. Now break it: the single point of failure here is ${spec.spof}.`,
    [5],
    OK("delivered"),
  );

  if (cutRequested) {
    push(
      { cut: true, hop: -1 },
      "One link cut. Nothing tells A that anything has changed — it will simply try again.",
      [7, 8],
      { text: "link severed", tone: "warn" },
    );

    const { path, dropIdx } = attempt(spec, true);
    for (let h = 0; h < path.length; h++) {
      push({ cut: true, hop: h }, `Retrying — hop ${h + 1}.`, [8, 9]);
    }

    push(
      {
        cut: true,
        hop: path.length,
        verdict: spec.detour ? OK(`rerouted · ${path.length} hops`) : FAIL("dropped · no path"),
      },
      spec.why,
      spec.detour ? [9] : [10],
      spec.detour
        ? OK(`${spec.label} survives the cut — rerouted in ${path.length} hops`)
        : FAIL(`${spec.label} is partitioned — E is unreachable${dropIdx !== null ? ` after ${dropIdx} hop${dropIdx === 1 ? "" : "s"}` : ""}`),
    );
  }

  return {
    steps,
    title: `${spec.label} Topology`,
    pseudocode: SINGLE_CODE,
    stats: [
      { label: "Hosts", value: "6", tone: "signal" },
      { label: "Links", value: String(spec.links.length), tone: "signal" },
      { label: "Hops A→E", value: String(spec.route.length), tone: "amber" },
      {
        label: "Survives 1 cut",
        value: spec.detour ? "yes" : "no",
        tone: spec.detour ? "mint" : "coral",
      },
    ],
  };
}

// --- public surface ---------------------------------------------------------

export type NetOp = "topoBus" | "topoStar" | "topoRing" | "topoMesh" | "topoHybrid" | "topoFailure";

const SPEC_FOR: Record<Exclude<NetOp, "topoFailure">, () => TopoSpec> = {
  topoBus: bus,
  topoStar: star,
  topoRing: ring,
  topoMesh: mesh,
  topoHybrid: hybrid,
};

export function runNetOperation(op: NetOp, faults: Fault[] = []): NetProgram {
  if (op === "topoFailure") return topoFailure();
  return singleTopo(SPEC_FOR[op](), faults);
}

/** Faults the sidebar offers for a given operation. */
export function netFaults(op: NetOp): FaultOption[] {
  if (op === "topoFailure") return [];
  const spec = SPEC_FOR[op]();
  return [
    {
      id: "cut",
      label: `Cut the ${spec.id === "hybrid" ? "trunk" : spec.id === "star" ? "E spoke" : "critical link"}`,
      hint: `Sever one link and re-send. ${spec.detour ? "There is an alternate path." : "There is no alternate path."}`,
      fault: { kind: "linkDown", id: spec.cutId },
    },
  ];
}

export const NET_OPERATIONS: { id: NetOp; label: string; icon: string; subpath: string }[] = [
  { id: "topoBus", label: "Bus", icon: "horizontal_rule", subpath: "topologies/bus" },
  { id: "topoStar", label: "Star", icon: "star", subpath: "topologies/star" },
  { id: "topoRing", label: "Ring", icon: "radio_button_unchecked", subpath: "topologies/ring" },
  { id: "topoMesh", label: "Mesh", icon: "hub", subpath: "topologies/mesh" },
  { id: "topoHybrid", label: "Hybrid", icon: "account_tree", subpath: "topologies/hybrid" },
  { id: "topoFailure", label: "Failure", icon: "link_off", subpath: "topologies/failure-comparison" },
];

/** Exposed for the canvas, which colors nodes by state. */
export type { CellState };
