# CN_Visualizer — Architecture & Build Plan

> An interactive, fully-animated Computer Networks visualizer for **21CSC302J**.
> Next.js (App Router) · TypeScript · Tailwind · framer-motion · zustand · Shiki.
>
> Same engine → frame → player architecture as **DSA-VISUALISER**. If you know
> that codebase, you know this one. Read `ARCHITECTURE.md` there for the
> original statement of the pattern; this doc records what changes for CN.

---

## 0. What carries over, what changes

| Thing | DSA-VISUALISER | CN_Visualizer |
| --- | --- | --- |
| Router model | folder tree **is** the route map | same |
| Navigation | landing → hub → hub → leaf | same |
| Core pattern | engine (pure) → `Program` of frames → zustand player → dumb canvas | same |
| Split axis | one engine **per data structure** | one engine **per visualization archetype** |
| Right rail | notes + pseudocode | notes + pseudocode **+ Cisco IOS config tab** |
| Badges | `complexity: { time, space }` | `stats: { label, value }[]` (hosts, hops, delay, efficiency…) |
| Extra verbs | — | **break it**: cut a link, drop a packet, flip a bit |
| Persistence | MongoDB (auth, presets, progress) | deferred — v1 is fully client-side |

The one genuinely new idea is the last row. In DSA a visualizer answers "how
does this run?". In CN it must also answer "what happens when this fails?" —
so every engine takes a **fault list** alongside its params, and the sidebar
gets a *Faults* section. That is what makes it a network simulator instead of
an animated textbook.

---

## 1. Routes mirror folders

```
app/topics/fundamentals/topologies/bus/page.tsx
        └───────────────── URL ──────────────┘
   /topics/fundamentals/topologies/bus
```

Units become readable slugs; the unit *number* is metadata, not a URL segment.

| Unit | Slug | Section title |
| --- | --- | --- |
| 1 | `fundamentals` | Network Fundamentals |
| 2 | `addressing` | Network Addressing |
| 3 | `routing` | Routing |
| 4 | `data-link` | Data Link & Error Control |
| 5 | `transport-application` | Transport & Application |

Plus two cross-unit sections built last: `labs` (Packet Tracer scenarios) and
`capstone` (Packet Journey, Master Simulation).

**Rule:** never rename a curriculum folder to change a route. The folder tree
is the canonical map of the product.

---

## 2. Engines — split by archetype, not by topic

`plan.md` §72 already classifies every topic into six visualization
categories. Those categories *are* the engine boundaries. Seven engines cover
all 45 session topics; **Unit 1 needs only the first three**, and all three are
reused heavily in later units — so Unit 1 is not throwaway scaffolding.

| # | Engine | Canvas | Frame shows | Unit 1 use | Later use |
| --- | --- | --- | --- | --- | --- |
| 1 | `netEngine` | `NetworkCanvas` | nodes, links, packets in flight, per-node tables | intro, PAN/LAN/MAN/WAN, topologies, switching | devices (U2), NAT, RIP/OSPF/BGP (U3), multicast |
| 2 | `layerEngine` | `LayerCanvas` | layer lanes + a PDU growing/shedding headers | OSI, encapsulation, TCP/IP model | headers (U5), packet-journey capstone |
| 3 | `signalEngine` | `SignalCanvas` + `DelayTimeline` | waveform, bits on a wire, stacked delay bars | physical layer, delay/bandwidth, guided + unguided media | — |
| 4 | `addressEngine` | `AddressBar` | 32-bit grid + address-space bar being carved | — | IPv4, classful, subnet mask, FLSM, VLSM, supernetting, IPv6 (U2) |
| 5 | `routingEngine` | reuses `NetworkCanvas` + `TablePanel` | graph + one routing table per router, per iteration | — | static/default, DV, Dijkstra, path vector, RIP/OSPF/BGP/EIGRP (U3) |
| 6 | `mediumEngine` | `ChannelChart` | shared channel as a time × station chart, collisions marked | — | ALOHA, CSMA/CD, CSMA/CA, Token Ring (U4) |
| 7 | `ladderEngine` | `LadderCanvas` | two-party sequence diagram with timers, loss, retransmit | — | Stop-and-Wait, ARQ, sliding window (U4); TCP handshake, DNS, HTTP, FTP, email, Telnet (U5) |

`bitEngine` (parity / checksum / CRC / Hamming, U4) is a small eighth — it can
reuse the `addressEngine` canvas primitives for bit rows.

**Reuse check:** 7 engines · 45 topics ≈ 6–7 topics per engine. In
DSA-VISUALISER the ratio was similar. This is the right granularity.

---

## 3. The frame contract

`types/visualization.ts` — one shared base, one `Step`/`Program` pair per
engine, exactly as in DSA.

```ts
export interface BaseStep {
  /** Instructor-note sentence for this frame. */
  description: string;
  /** Pseudocode / config lines to highlight (1-based). */
  codeLines?: number[];
  /** Banner: "collision detected", "route converged", "link down". */
  message?: { text: string; tone: "ok" | "error" | "info" };
}

export interface Program<S extends BaseStep> {
  steps: S[];
  title: string;
  /** Algorithm steps, or the semantic anchors for a config sample. */
  pseudocode: string[];
  /** Replaces DSA's Big-O badge: "Hops 4", "Total delay 21 ms", "Usable hosts 62". */
  stats: { label: string; value: string }[];
  /** Key into data/cn/config/* — the Cisco IOS tab in the right rail. */
  configKey?: string;
}
```

Engines are pure. `run(op, params, faults) -> Program` — no React, no time, no
randomness that isn't seeded. Deterministic ⇒ scrubbable ⇒ replayable, which
is the whole reason the DSA player felt good.

### The network frame (engine 1, the big one)

```ts
export type NodeKind = "host" | "switch" | "router" | "hub" | "server" | "ap" | "cloud";
export type LinkState = "idle" | "active" | "reserved" | "congested" | "down";

export interface NetNode {
  id: string; label: string; kind: NodeKind;
  x: number; y: number;              // normalized 0–100, same trick as GraphVNode
  state: SQCellState;
  badge?: string;                    // "192.168.1.10", "MAC AA:BB"
  ring?: boolean;                    // spotlight (sender/receiver)
}

export interface NetLink {
  id: string; from: string; to: string;
  state: LinkState;
  label?: string;                    // "100 Mbps", "cost 4"
}

/** A packet mid-flight. `t` in [0,1] along its current link — framer-motion
 *  tweens between frames, so movement is smooth without per-pixel frames. */
export interface Packet {
  id: string; label: string;         // "P1", "SYN", "TOKEN"
  linkId: string; t: number;
  kind: "data" | "ack" | "control" | "broadcast";
  state: "flying" | "queued" | "dropped" | "delivered";
}

export interface NetStep extends BaseStep {
  nodes: NetNode[];
  links: NetLink[];
  packets: Packet[];
  /** Per-node table (MAC table, routing table, NAT table) — U2/U3 reuse. */
  table?: { title: string; columns: string[]; rows: GraphTableCell[][] };
  /** Reassembly buffer / arrival-order strip. */
  strip?: { label: string; chips: TokenChip[] };
}
```

Stable ids + normalized coords means a *topology change* re-lays-out and the
nodes **glide** — which is precisely the PAN→LAN→MAN→WAN and bus→star→ring
transitions the plan asks for. Same trick that made AVL rotations read well.

---

## 4. Unit 1 — the deliverable

Ten syllabus topics → **7 categories, 30 leaves**. (Arrays in DSA was ~25
leaves, so this is the same density.)

```
topics/fundamentals/
├── introduction/
│   └── what-is-a-network            netEngine — node, link, packet A→B
├── network-types/
│   ├── pan/ lan/ man/ wan           netEngine — same 6 devices, 4 scales
│   └── scale-comparison             all four side by side, zooming out
├── topologies/
│   ├── bus/ star/ ring/ mesh/ hybrid    netEngine — same 6 nodes, rewired
│   └── failure-comparison           cut one link in each, watch who survives
├── switching/
│   ├── circuit-switching            path reservation, then transmit
│   ├── packet-switching             packetize → divergent paths → reassemble
│   └── circuit-vs-packet            same message, two journeys, side by side
├── layering/
│   ├── osi-model                    layerEngine — 7 lanes, roles
│   ├── encapsulation                "HELLO" → segment → packet → frame → bits
│   └── tcp-ip-model                 4 layers, mapped against OSI
├── performance/
│   ├── transmission-delay           signalEngine — bits leaving the NIC
│   ├── propagation-delay            signal crossing the wire
│   ├── queuing-and-processing       router buffer filling
│   └── bandwidth-vs-latency         the flagship: same file, two links
└── transmission-media/
    ├── signal-basics                bits → voltage / light / radio
    ├── guided/     twisted-pair · coaxial · fiber-optic
    ├── unguided/   radio-waves · microwaves · infrared
    └── media-comparison             distance · speed · interference
```

### Flagship leaves (build these first — they carry the UI verdict)

1. **`topologies/failure-comparison`** — five topologies, one cut link each.
   Sells `netEngine` and the fault system in a single screen.
2. **`layering/encapsulation`** — the word `HELLO` descending seven lanes,
   each layer clamping on a header. The screenshot everyone remembers.
3. **`performance/bandwidth-vs-latency`** — two links racing the same file,
   with the delay bar chart building underneath.

If the UI reads well on these three, it reads well on the other 27.

---

## 5. Screen anatomy (unchanged from DSA)

```
┌─ Navbar ─────────────────────────────────────────────────────────┐
├──────────┬──────────────────────────────────────┬───────────────┤
│ Sidebar  │  TopicHeader + breadcrumb            │  Notes rail   │
│          │                                      │               │
│ Build    │           CANVAS                     │  step-by-step │
│ Faults   │       (the animation)                │  narration    │
│ Run      │                                      │  ─────────    │
│          │  [Theory] [Code] pills float here    │  Pseudocode   │
│          │                                      │  / IOS config │
├──────────┴──────────────────────────────────────┴───────────────┤
│ TransportBar:  ⏮ ⏯ ⏭   ━━━●━━━━━━  step 7/24   speed ×1        │
└──────────────────────────────────────────────────────────────────┘
```

Ported near-verbatim from DSA: `AppShell`, `Navbar`, `ShaderBackground`,
`TopicHub`, `TopicCard`, `Breadcrumb`, `Icon`, `TransportBar`, `NotesPanel`,
`PseudocodeModal`, `TheoryButton`, `FitStage`, `VisualizerShell`,
`VisualizerSessionContext`. These are structure-agnostic — they only ever
touched *frames*, never arrays. Copy, retheme, done.

**New in the sidebar: the Faults section.** Checkboxes/toggles that inject a
`Fault[]` into `engine.run()`:

```ts
type Fault =
  | { kind: "linkDown"; linkId: string }
  | { kind: "nodeDown"; nodeId: string }
  | { kind: "packetLoss"; rate: number }
  | { kind: "congest"; linkId: string }
  | { kind: "bitFlip"; index: number };   // U4
```

One mechanism, and §68 of `plan.md` (Failure / What-If) is satisfied for the
entire course.

---

## 6. Design system — "Signal & Wire"

Same dark Material-3 token set as Ember & Coral (surfaces `#131313` /
`#1c1b1b` / `#201f1f`, JetBrains Mono everywhere, Material Symbols icons, the
low-opacity WebGL orb background) so all ported chrome works untouched — but a
**new accent trio**, chosen for what networking actually needs to color-code:

| Token | Hex | Means |
| --- | --- | --- |
| `signal` (primary) | `#22D3EE` cyan | data / payload / the packet you're following |
| `amber` | `#F5A623` | control & decision — ACK-pending, routing choice, token |
| `mint` | `#34C98A` | success — delivered, converged, checksum OK |
| `coral` | `#FF5F4A` | failure — collision, drop, link down, bit error |

Coral demoting from *primary* to *the failure color* is what makes CN look
like a sibling of DSA rather than a reskin — and it means a broken network is
legible at a glance. Shader orbs get retuned cyan/violet/mint to match.

---

## 7. Directory map

```
app/
  page.tsx                  Landing — 5 unit cards + capstone
  topics/**/page.tsx        Hubs + leaves (mirror the curriculum)
components/
  layout/                   AppShell, Navbar, Sidebar, ShaderBackground
  visualizer/               VisualizerShell, TransportBar, NotesPanel,
                            CodePanel, *Canvas, *VisualizerScreen, *Sidebar
  topic/                    TopicHub, TopicCard, Breadcrumb
  ui/                       Icon and primitives
engines/                    netEngine, layerEngine, signalEngine (U1)
                            addressEngine, routingEngine, mediumEngine,
                            ladderEngine, bitEngine (U2–U5)
lib/                        netStore, layerStore, signalStore (zustand players)
                            sessions.ts, uiStore, shiki
data/
  curriculum.ts             tree metadata for landing + hubs
  theory.ts                 per-leaf theory docs (exam-facing prose)
  cn/config/*               Cisco IOS samples for the config rail
types/visualization.ts      the shared frame contract
```

---

## 8. Build order

**Phase 0 — Shell.** Scaffold Next + Tailwind with the Signal & Wire tokens.
Port the chrome listed in §5. `curriculum.ts` for all five units (hubs render,
unbuilt leaves show `status: "soon"`). Landing + `fundamentals` hub live.

**Phase 1 — `netEngine`.** Frame type, `NetworkCanvas`, `netStore`,
`NetworkVisualizerScreen`, faults. → 15 leaves: introduction, network-types,
topologies, switching.

**Phase 2 — `layerEngine`.** `LayerCanvas` + header-stack animation.
→ 3 leaves: layering.

**Phase 3 — `signalEngine`.** `SignalCanvas` + `DelayTimeline`.
→ 12 leaves: performance, transmission-media.

**Phase 4 — Polish.** Theory docs per leaf, IOS config rail, the reel-friendly
fullscreen/clean mode, responsive pass.

Then, and only then, Unit 2. Do not scaffold a later unit's pages before its
turn — but leave the *folders* in place, since they define the eventual routes.

---

## 9. Adding a leaf (the only repetitive task)

1. Add the operation to the relevant engine.
2. Add the leaf's metadata to `data/curriculum.ts`.
3. Write a one-line page:

```tsx
// app/topics/fundamentals/topologies/bus/page.tsx
import { NetworkVisualizerScreen } from "@/components/visualizer/NetworkVisualizerScreen";

export default function Page() {
  return (
    <NetworkVisualizerScreen
      path="/topics/fundamentals/topologies/bus"
      title="Bus Topology"
      blurb="One shared backbone — every node hears every frame."
      operation="topoBus"
      defaultParams={{ from: "A", to: "E" }}
    />
  );
}
```

---

## 10. Guiding principle

> Every concept that describes a process should **move**. Every concept that
> involves an algorithm should **execute step-by-step**. Every protocol should
> **show its messages**. Every network should be **breakable**. Every
> calculation should **expose its intermediate state**.

If a leaf can't be broken and can't be stepped, it's a diagram — rethink it.
