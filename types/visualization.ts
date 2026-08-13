// ---------------------------------------------------------------------------
// Core visualization types
//
// Every engine (net, layer, signal, address, routing, medium, ladder) compiles
// a user operation into a flat list of frames. The player walks that list
// forward/backward; the canvas renders whatever the *current* frame describes.
// Frames are full snapshots, so animation is deterministic, scrubbable, and
// identical on every replay.
//
// Split axis note: DSA-VISUALISER had one engine per data structure. CN has one
// engine per *visualization archetype*, because 45 syllabus topics reduce to
// about seven ways of drawing a network. See ARCHITECTURE.md §2.
// ---------------------------------------------------------------------------

/** Shared element state palette. Drives border/glow color on every canvas. */
export type CellState =
  | "idle"
  | "active" // currently transmitting / being examined
  | "visited" // already processed this run
  | "new" // just appeared / just learned
  | "removing" // being torn down
  | "target" // the destination we're trying to reach
  | "found" // reached / delivered / converged
  | "failed"; // unreachable / dropped / errored

/** A chip in an input, output or buffer strip. */
export interface TokenChip {
  text: string;
  state: "pending" | "active" | "done" | "matched" | "error";
}

/** One cell of a data table beside the canvas (MAC table, routing table, NAT). */
export interface TableCell {
  text: string;
  state?: "idle" | "changed" | "final" | "head";
}

export interface DataTable {
  title: string;
  columns: string[];
  rows: { label: string; cells: TableCell[] }[];
}

/** Banner shown under the canvas — "collision detected", "route converged". */
export interface StepMessage {
  text: string;
  tone: "ok" | "error" | "info" | "warn";
}

/** Everything every frame carries, whatever the engine. */
export interface BaseStep {
  /** Instructor-note sentence describing what is happening this frame. */
  description: string;
  /** 1-based pseudocode/config line numbers to light up. */
  codeLines?: number[];
  message?: StepMessage;
}

/**
 * The compiled result an engine returns for one operation.
 *
 * `stats` replaces DSA's Big-O badge — CN's equivalent summary numbers are
 * things like "Hops 4", "Total delay 21 ms", "Usable hosts 62".
 */
export interface Program<S extends BaseStep> {
  steps: S[];
  title: string;
  pseudocode: string[];
  stats: { label: string; value: string; tone?: "signal" | "amber" | "mint" | "coral" }[];
}

// ---------------------------------------------------------------------------
// Faults — the thing that makes this a simulator, not an animated textbook.
//
// Every engine takes a Fault[] alongside its params, so "what if this breaks?"
// is one mechanism shared by the whole course (plan.md §68) instead of a
// bespoke feature per topic.
// ---------------------------------------------------------------------------

export type Fault =
  | { kind: "linkDown"; id: string }
  | { kind: "nodeDown"; id: string }
  | { kind: "packetLoss"; rate: number }
  | { kind: "congest"; id: string }
  | { kind: "bitFlip"; index: number };

/** A fault the sidebar offers for the current operation. */
export interface FaultOption {
  id: string;
  label: string;
  hint: string;
  fault: Fault;
}

// ===========================================================================
// ENGINE 1 — netEngine  ·  NetworkCanvas
//
// Nodes wired by links, with packets moving along them. Powers Unit 1's
// introduction, PAN/LAN/MAN/WAN, topologies and switching; later the Unit 2
// devices, NAT, and every Unit 3 routing protocol (which add `table`).
//
// A frame holds *panels* rather than one graph, so a side-by-side comparison
// ("five topologies, one cut link each") is the same primitive as a single
// network — it just has five panels instead of one.
// ===========================================================================

export type NodeKind =
  | "host" // PC / laptop / phone
  | "switch"
  | "router"
  | "hub"
  | "server"
  | "tap" // a drop point on a bus backbone
  | "cloud";

export type LinkState =
  | "idle"
  | "active" // carrying the frame we're following
  | "reserved" // circuit-switched dedicated path
  | "congested"
  | "down"; // severed

export interface NetNode {
  id: string;
  label: string;
  kind: NodeKind;
  /** Normalized panel coords, 0–100. Canvas maps them to pixels. */
  x: number;
  y: number;
  state: CellState;
  /** Small badge under the node — an IP, a MAC, a hop count. */
  badge?: string;
  /** Spotlight ring: the sender / receiver of the current flow. */
  ring?: boolean;
}

export interface NetLink {
  id: string;
  from: string;
  to: string;
  state: LinkState;
  /** "100 Mbps", "cost 4" — drawn as a chip at the midpoint. */
  label?: string;
  /** Bus backbone segments draw thicker than ordinary drop links. */
  backbone?: boolean;
}

/**
 * A packet mid-flight: `t` is its progress along `linkId`, 0 → 1 from `from`
 * to `to`. Emitting one frame per hop is enough — framer-motion tweens the
 * position between frames, so the packet glides instead of teleporting.
 */
export interface Packet {
  id: string;
  label: string;
  linkId: string;
  t: number;
  kind: "data" | "ack" | "control" | "broadcast";
  state: "flying" | "queued" | "dropped" | "delivered";
}

export interface NetPanel {
  id: string;
  label: string;
  /** Sub-label: "one shared backbone", "6 links, 1 hub". */
  sub?: string;
  nodes: NetNode[];
  links: NetLink[];
  packets: Packet[];
  verdict?: StepMessage;
  /** Dimmed while another panel is being narrated. */
  dim?: boolean;
}

export interface NetStep extends BaseStep {
  panels: NetPanel[];
  table?: DataTable;
  strip?: { label: string; chips: TokenChip[] };
}

export type NetProgram = Program<NetStep>;

export type NetOperationId =
  | "topoBus"
  | "topoStar"
  | "topoRing"
  | "topoMesh"
  | "topoHybrid"
  | "topoFailure";

// ===========================================================================
// ENGINE 2 — layerEngine  ·  LayerCanvas
//
// The OSI/TCP-IP stack as lanes, with one PDU descending the sender's lanes
// gaining headers and climbing the receiver's shedding them. Later reused for
// Unit 5 header anatomy and the end-to-end Packet Journey capstone.
// ===========================================================================

export type HeaderTone = "signal" | "amber" | "mint" | "violet" | "coral";

/** One header (or trailer) clamped around the payload. */
export interface PduHeader {
  id: string;
  label: string;
  tone: HeaderTone;
  /** What this header actually carries — shown when it is added. */
  note?: string;
}

export interface LayerLane {
  /** 7 → 1 for OSI, 4 → 1 for TCP/IP. */
  n: number;
  name: string;
  /** One-line job description. */
  role: string;
  /** What the PDU is called at this layer. */
  pduName: string;
  state: "idle" | "active" | "done";
}

export interface LayerStep extends BaseStep {
  lanes: LayerLane[];
  /** Lane the PDU currently sits in; 0 means it is on the wire. */
  at: number;
  side: "sender" | "wire" | "receiver";
  /** Outermost header first — left to right on screen. */
  headers: PduHeader[];
  payload: string;
  trailer?: PduHeader;
  /** Physical layer only: the actual bits. */
  bits?: string;
  /** Header added this frame — flashes in. */
  addedId?: string;
  /** Header stripped this frame — flashes out. */
  removedId?: string;
}

export type LayerProgram = Program<LayerStep>;

export type LayerOperationId = "osiModel" | "encapsulation" | "tcpIpModel";

// ===========================================================================
// ENGINE 3 — signalEngine  ·  SignalCanvas
//
// Links drawn as *pipes*: the pipe's thickness is bandwidth, its length is
// propagation delay. The same file poured into two differently-shaped pipes is
// the entire "why is my fast connection slow?" lesson in one picture, with the
// four delay components stacked as bars underneath.
// ===========================================================================

export type DelayKind = "transmission" | "propagation" | "processing" | "queuing";

export interface DelaySeg {
  kind: DelayKind;
  ms: number;
}

export interface SignalTrack {
  id: string;
  label: string;
  /** "Fibre · 100 Mbps · 2 ms one-way". */
  sub: string;
  bandwidthMbps: number;
  propagationMs: number;
  /** Leading / trailing edge of the bit stream along the pipe, 0–1. */
  frontT: number;
  tailT: number;
  /** Bits pushed onto the wire so far, and the total to send. */
  sentBits: number;
  totalBits: number;
  /** Bits that have arrived at the far end. */
  deliveredBits: number;
  /** Virtual clock reading for this track at this frame. */
  elapsedMs: number;
  /** Filled in once the last bit lands. */
  finishedMs?: number;
  tone: HeaderTone;
}

export interface SignalStep extends BaseStep {
  tracks: SignalTrack[];
  /** Stacked delay-breakdown bars under the pipes. */
  chart?: {
    title: string;
    maxMs: number;
    rows: { label: string; segs: DelaySeg[]; totalMs: number }[];
  };
  /** The shared virtual clock, in ms. */
  clockMs: number;
}

export type SignalProgram = Program<SignalStep>;

export type SignalOperationId =
  | "bandwidthVsLatency"
  | "transmissionDelay"
  | "propagationDelay"
  | "queuingProcessing";
