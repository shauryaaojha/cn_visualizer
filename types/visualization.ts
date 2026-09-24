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

/**
 * A question asked *before* a frame is revealed, when Predict mode is on.
 * The student commits to an answer, then the frame shows whether they were
 * right — retrieval first, explanation second.
 */
export interface Prediction {
  question: string;
  options: string[];
  /** Index into `options`. */
  answer: number;
  /** One line shown after answering — why the right answer is right. */
  why?: string;
}

/** Everything every frame carries, whatever the engine. */
export interface BaseStep {
  /** Instructor-note sentence describing what is happening this frame. */
  description: string;
  /** 1-based pseudocode/config line numbers to light up. */
  codeLines?: number[];
  message?: StepMessage;
  /** Short name for this frame on the timeline — "L4 ↓", "wire", "FCS ✓". */
  label?: string;
  /** Asked before this frame is shown, when Predict mode is on. */
  predict?: Prediction;
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

// ===========================================================================
// ENGINE 4 — mediaEngine  ·  MediaCanvas
//
// Physical transmission media visualizations: waveforms, twisted-pair noise
// cancellation, coaxial cutaway shields, fiber optic Total Internal Reflection,
// unguided EM radiation modes, and comparative multi-axis radar benchmarks.
// ===========================================================================

export type MediaKind =
  | "waveform"
  | "twistedPair"
  | "coaxial"
  | "rayOptics"
  | "antennaWave"
  | "comparisonRadar";

export type SignalType = "nrz" | "manchester" | "am" | "fm" | "qam";

export interface MediaWaveform {
  signalType: SignalType;
  bits: string;
  /** How many bits of the waveform have been drawn so far. */
  drawn: number;
}

export interface MediaTwistedPair {
  twistRate: number; // twists per metre
  noiseLevel: number; // 0–1
}

export interface CoaxLayer {
  id: string;
  name: string;
  material: string;
  purpose: string;
  /** Radius in a 0–50 viewBox. */
  radius: number;
  color: string;
}

export interface MediaCoaxial {
  layers: CoaxLayer[];
}

export interface MediaRayOptics {
  coreIndex: number;
  claddingIndex: number;
  criticalAngleDeg: number;
  /** Angle of incidence at the core–cladding boundary, from the normal. */
  launchAngleDeg: number;
  isTIR: boolean;
  mode: "smf" | "mmf";
}

export interface MediaAntennaWave {
  type: "radio" | "microwave" | "infrared";
  frequencyLabel: string;
  rangeLabel: string;
  rainAttenuationDb?: number;
}

export interface MediumScore {
  name: string;
  bandwidth: number; // 1–10
  maxDistance: number;
  emiImmunity: number;
  lowCost: number; // higher = cheaper
  security: number;
  color: string;
}

export type MediumAxis = "bandwidth" | "maxDistance" | "emiImmunity" | "lowCost" | "security";

export interface MediaComparisonRadar {
  media: MediumScore[];
  /** The attribute being compared this frame, if any. */
  axis?: MediumAxis;
}

export interface MediaStep extends BaseStep {
  kind: MediaKind;
  /** The part being narrated this frame — the canvas highlights it. */
  focus?: string;
  /** How far the reveal has got (0 = just the setup). */
  phase: number;
  waveform?: MediaWaveform;
  twistedPair?: MediaTwistedPair;
  coaxial?: MediaCoaxial;
  rayOptics?: MediaRayOptics;
  antennaWave?: MediaAntennaWave;
  comparisonRadar?: MediaComparisonRadar;
}

export type MediaProgram = Program<MediaStep>;

export type MediaOperationId =
  | "signalBasics"
  | "guidedTwistedPair"
  | "guidedCoaxial"
  | "guidedFiber"
  | "unguidedRadio"
  | "unguidedMicrowave"
  | "unguidedInfrared"
  | "mediaComparison";

// ===========================================================================
// ENGINE 6 — routingEngine  ·  RoutingCanvas
//
// A network graph paired with one or more routing tables. Unit 3 uses it for
// forwarding and distance-vector first; static/default routes, link-state,
// path-vector, RIP, OSPF, BGP, EIGRP and multicast reuse this same frame shape.
// Graph primitives deliberately come from ENGINE 1: a route is still a packet
// crossing NetNodes and NetLinks, while the tables explain why it chose a hop.
// ====================================================================

export interface RoutingTableEntry {
  destination: string;
  nextHop: string;
  outgoingInterface: string;
  metric: number;
  /** AS path, router path, or SPF path when a protocol needs to expose it. */
  path?: string[];
  /** `changed` flashes a learned route; `final` marks a settled best route. */
  state?: TableCell["state"];
}

export interface RoutingTable {
  id: string;
  title: string;
  routerId?: string;
  entries: RoutingTableEntry[];
  /** A forwarding lesson can spotlight one router while DV shows all of them. */
  focused?: boolean;
}

export interface RoutingUpdate {
  /** Packet-shaped control-plane update travelling between adjacent routers. */
  packet: Packet;
  from: string;
  to: string;
  kind: "vector" | "lsa";
}

export interface RoutingStep extends BaseStep {
  panels: NetPanel[];
  /** One focused table or N simultaneous tables, according to the operation. */
  tables: RoutingTable[];
  round: number;
  converged: boolean;
  updates?: RoutingUpdate[];
}

export type RoutingProgram = Program<RoutingStep>;

// Extend only as their engines land: staticRouting, defaultRouting, linkState,
// pathVector, ripV1, ripV2, ospfSingleArea, ospfMultiArea, bgp, eigrp,
// multicasting, ipv6Basics.
export type RoutingOperationId = "ipForwarding" | "distanceVector";

// ===========================================================================
// ENGINE 5 — addressEngine  ·  AddressCanvas
//
// 32-bit binary grid and proportional address-space bar. Powers IPv4 addressing
// and VLSM in Unit 2, as well as upcoming leaves for classful addressing,
// subnet masks, FLSM, classless / CIDR, supernetting, and NAT. Reused by Unit 4
// bitEngine for bit-level error detection and correction.
// ===========================================================================

export type AddrBitRole = "network" | "host" | "subnet" | "class-prefix";

export interface AddrBit {
  val: 0 | 1;
  role: AddrBitRole;
  state: CellState;
  /** Place value within the octet: 128, 64, 32, 16, 8, 4, 2, 1 */
  placeValue?: number;
  /** Global bit index 0–31 from MSB to LSB */
  index?: number;
}

export interface AddrOctet {
  decimal: number;
  bits: AddrBit[];
  label?: string;
  state?: CellState;
}

export interface AddrGridRow {
  id: string;
  label: string;
  octets: AddrOctet[];
  /** Where the boundary marker falls (0–32 bits from MSB). Divider line is drawn after this bit. */
  boundaryAfterBit?: number;
}

export interface AddrBlock {
  id: string;
  label: string;
  startIp: string;
  endIp: string;
  prefix: number;
  /** Proportional placement within the parent space (0–100%) */
  offsetPct: number;
  /** Proportional width within the parent space (0–100%) */
  widthPct: number;
  /** Chalk hue from CHALK_SERIES or PALETTE */
  color: string;
  usableHosts: number;
  /** VLSM requirement: how many hosts this department actually asked for */
  hostsNeeded?: number;
  /** VLSM overhead: usable capacity allocated minus hosts requested */
  hostsWasted?: number;
  state?: CellState;
  /** Nested blocks showing hierarchical carves (e.g., /24 -> /25 -> /26) */
  children?: AddrBlock[];
}

export interface AddrSpaceBar {
  title?: string;
  baseBlock: string;
  blocks: AddrBlock[];
  totalAddresses: number;
}

export interface AddrFact {
  label: string;
  value: string;
  tone?: "signal" | "amber" | "mint" | "coral";
}

export interface AddrStep extends BaseStep {
  /** Stacked 32-bit grid rows (single IP, IP over MASK, or stacked networks) */
  gridRows?: AddrGridRow[];
  /** Address space bar carved into proportional subnets (VLSM, FLSM) */
  spaceBar?: AddrSpaceBar;
  /** Secondary comparison bar (e.g., FLSM vs VLSM comparison) */
  comparisonBar?: AddrSpaceBar;
  /** Key/value facts readout: Network, Broadcast, Usable range, etc. */
  facts?: AddrFact[];
  /** Reused DataTable for block summaries or NAT tables */
  table?: DataTable;
}

export type AddrProgram = Program<AddrStep>;

/**
 * Address operations.
 * Currently implemented: "ipv4Addressing" | "vlsm"
 * Coming in future passes:
 * - introAddressing
 * - classfulAddressing
 * - subnetMask
 * - flsm
 * - classlessAddressing
 * - nat
 * - supernetting
 */
export type AddrOperationId = "ipv4Addressing" | "vlsm";


// ===========================================================================
// ENGINE 7 — ladderEngine  ·  LadderCanvas
//
// A message-sequence ("ladder") diagram: one vertical lane per participant,
// time running down, each message a slanted arrow from sender to receiver.
// Powers Unit 4 flow control (stop-and-wait, ARQ, sliding window), every
// Unit 5 protocol conversation (handshake, TCP reliability and flow control,
// UDP, HTTP, FTP, email, Telnet, DNS) and the capstone Packet Journey.
// ===========================================================================

export type LadderLaneKind = "host" | "server" | "router" | "dns" | "mail" | "app";

export interface LadderLane {
  id: string;
  label: string;
  /** "10.0.0.5 : 51000", "port 21". */
  sub?: string;
  kind: LadderLaneKind;
}

export interface LadderMsg {
  id: string;
  from: string;
  to: string;
  /** Time row it leaves at and arrives at; t1 > t0 draws the flight slope. */
  t0: number;
  t1: number;
  label: string;
  kind: "data" | "ack" | "control" | "query" | "reply";
  /** `lost` stops halfway with an ✕. */
  state: "done" | "lost";
  /** Sent in this frame — the canvas animates it in. */
  fresh?: boolean;
  /** Header fields this message actually carries, for the Inspector. */
  fields?: [string, string][];
  /** Which connection it belongs to, when a lesson has two (FTP). */
  channel?: string;
}

export interface LadderMark {
  lane: string;
  t: number;
  /** A timer runs from t to t1. */
  t1?: number;
  kind: "timer" | "timeout" | "deliver" | "note" | "drop" | "buffer";
  label: string;
}

/** The sender's window drawn as a strip of numbered slots. */
export interface WindowStrip {
  label: string;
  total: number;
  /** First unacknowledged, next to send, window size. */
  base: number;
  next: number;
  size: number;
  acked: number;
}

export interface LadderStep extends BaseStep {
  lanes: LadderLane[];
  msgs: LadderMsg[];
  marks: LadderMark[];
  /** Time rows in the whole run — fixes the vertical scale. */
  tMax: number;
  window?: WindowStrip;
  /** Small readout beside the ladder — seq/ack, rwnd, cache. */
  side?: { title: string; rows: [string, string][] };
}

export type LadderProgram = Program<LadderStep>;

// ===========================================================================
// ENGINE 8 — bitEngine  ·  BitCanvas
//
// Rows of bits you can watch arithmetic happen on: parity counting, one's-
// complement checksum addition, CRC long division and Hamming syndrome.
// ===========================================================================

export type BitRole = "data" | "check" | "gen" | "work" | "rem" | "pad" | "sum";

export interface BitCell {
  v: 0 | 1;
  role: BitRole;
  state: "idle" | "active" | "flip" | "ok" | "bad" | "dim";
  /** Tiny tag above the cell — "p1", "d3", "2⁴". */
  tag?: string;
}

export interface BitRow {
  id: string;
  label: string;
  cells: BitCell[];
  /** Cells to indent by, so long-division rows line up under the dividend. */
  offset?: number;
  /** Right-hand annotation — "= 0x3A", "3 ones → odd". */
  note?: string;
  /** Group rows under one heading. */
  group?: "sender" | "wire" | "receiver" | "work";
}

export interface BitStep extends BaseStep {
  rows: BitRow[];
  /** Width of the widest row in cells — keeps the grid steady between frames. */
  cols: number;
  readout?: [string, string][];
}

export type BitProgram = Program<BitStep>;

// ===========================================================================
// ENGINE 9 — frameEngine  ·  FrameCanvas
//
// Header anatomy: a frame or segment drawn field by field, to scale, filled
// in with the student's own values. Ethernet, HDLC, PPP, UDP, TCP and ports.
// ===========================================================================

export interface FrameField {
  id: string;
  name: string;
  /** Size in bits (bytes × 8 for byte-oriented frames). */
  bits: number;
  value: string;
  tone: HeaderTone;
  state: "empty" | "new" | "set" | "focus" | "bad";
  /** What the field is for — the Inspector's first line. */
  about?: string;
}

export interface DemuxApp {
  name: string;
  port: number;
  proto: "TCP" | "UDP";
  active?: boolean;
}

export interface FrameStep extends BaseStep {
  fields: FrameField[];
  /** Draw as RFC-style rows of this many bits (TCP/UDP: 32); omit for one strip. */
  rowBits?: number;
  /** Raw bit stream under the frame, for bit-stuffing lessons. */
  stream?: { label: string; bits: string; marks?: number[] };
  /** Port numbers: segments being handed to processes. */
  demux?: { apps: DemuxApp[]; incoming?: { port: number; proto: "TCP" | "UDP"; label: string } };
}

export type FrameProgram = Program<FrameStep>;

// ===========================================================================
// ENGINE 10 — macEngine  ·  MacCanvas
//
// A shared channel over time: one row per station, time left to right, each
// transmission a bar. Overlapping bars are collisions. Powers the MAC
// problem, ALOHA, CSMA/CD, CSMA/CA and Token Ring.
// ===========================================================================

export interface MacStation {
  id: string;
  label: string;
  state: "idle" | "sensing" | "sending" | "backoff" | "waiting" | "done" | "holding" | "collided";
}

export interface MacTx {
  id: string;
  station: string;
  start: number;
  end: number;
  kind: "data" | "jam" | "rts" | "cts" | "ack" | "token" | "backoff" | "difs" | "sense";
  state: "ok" | "collided" | "pending";
  label?: string;
}

export interface MacStep extends BaseStep {
  stations: MacStation[];
  txs: MacTx[];
  /** Current time and the full time axis. */
  now: number;
  tMax: number;
  /** Slot length for slotted schemes; draws slot boundaries. */
  slot?: number;
  channel: "idle" | "busy" | "collision";
  /** Token Ring: who holds the token now. */
  token?: string;
  ring?: boolean;
  readout?: [string, string][];
}

export type MacProgram = Program<MacStep>;

// ===========================================================================
// ENGINE 11 — journeyEngine  ·  JourneyCanvas
//
// The capstone: one request crossing a real little network, hop by hop,
// with the whole header stack shown at every hop so you can see which
// headers change (Ethernet, TTL) and which never do (IP addresses, ports).
// ===========================================================================

export interface PduLayer {
  layer: "Application" | "Transport" | "Network" | "Data Link" | "Physical";
  name: string;
  fields: [string, string][];
  /** Field names that changed at this hop. */
  changed?: string[];
}

export interface JourneyStep extends BaseStep {
  panels: NetPanel[];
  pdu: PduLayer[];
  /** Which phase of the journey — DNS, TCP, HTTP… */
  phase: string;
  /** Where the packet is right now. */
  at: string;
}

export type JourneyProgram = Program<JourneyStep>;
