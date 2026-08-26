# UNIT 1: NETWORK FUNDAMENTALS — MASTER VISUALIZATION PROMPT & SPECIFICATION BLUEPRINT

> **Target Course:** 21CSC302J – Computer Networks (July–December 2026 Curriculum)  
> **Unit Scope:** Unit 1 — Network Fundamentals (Topics 1–9, 7 Categories, 30 Leaves)  
> **Tech Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Framer Motion · Zustand · Lucide Icons  
> **Design Theme:** *Chalk & Talk* (Chalkboard aesthetic, Kalam handwriting typography, JetBrains Mono data typography, dashed chalk borders, deterministic frame playback)

---

## 1. Executive Summary & Purpose

This document is the **definitive, production-ready master prompt and implementation blueprint** for building out the complete interactive visualization suite for **Unit 1: Network Fundamentals** in `cn_visualizer`.

The goal of `cn_visualizer` is **not** to create static slide decks or animated textbook definitions. It turns fundamental networking concepts into **living, interactive, fault-tolerant simulations**:
- Packets physically traverse links, queue in buffers, and suffer serialization/propagation delays.
- Headers are dynamically constructed, clamped onto user payloads, and parsed/stripped byte-by-byte.
- Faults can be injected in real-time (cutting links, disabling nodes, dropping packets, adding propagation delay) to witness network resilience and failure modes.
- Every animation is completely **deterministic, scrubbable, parametric, and replayable**.

---

## 2. Core Architectural Invariants

Every visualizer in this codebase **must** adhere strictly to the established 4-layer unidirectional pipeline:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. PURE ENGINE                                                          │
│    run(params, faults) -> Program<Step>                                 │
│    - Pure TypeScript, zero React dependencies, zero unseeded randomness  │
│    - Computes full array of snapshot frames with descriptions & metrics │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. ZUSTAND PLAYER STORE                                                 │
│    - Manages stepIndex, playback state (playing, paused, speed: 0.5x-3x)│
│    - Immutable updates, time scrubbing, forward/backward stepping       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. DUMB CANVAS (SVG / HTML5 Canvas / Framer Motion)                     │
│    - Renders exactly what `currentStep` dictates                         │
│    - Uses stable element keys and normalized (0–100) coordinates to     │
│      enable fluid spring tweens across frame transitions                │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. LESSON SHELL & CONTROLS                                              │
│    - Left Rail: Real interactive inputs + Fault injection toggles       │
│    - Top: FitStage canvas viewport                                      │
│    - Middle: PlayerControls (Play/Pause, Step, Scrub, Speed, Stats)     │
│    - Bottom: LessonNote (Teacher's Note, So Far step list, Algorithm)  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.1 The Frame Contract (`types/visualization.ts`)

Every step rendered by any engine extends `BaseStep`:

```typescript
export type CellState =
  | "idle"        // Inactive / default wire or node
  | "active"      // Currently transmitting / inspecting / processing
  | "visited"     // Traversed earlier in this execution
  | "new"         // Created or allocated this frame
  | "removing"    // Being torn down or deallocated
  | "target"      // Destination endpoint
  | "found"       // Successfully delivered / converged / matched
  | "failed";     // Dropped / collision / partitioned / error

export interface BaseStep {
  /** The instructor's direct explanation for this exact frame (Teacher's voice). */
  description: string;
  /** 1-based line numbers in the pseudocode to highlight. */
  codeLines?: number[];
  /** Status banner under canvas: ok (mint), error (coral), warn (amber), info (blue). */
  message?: {
    text: string;
    tone: "ok" | "error" | "info" | "warn";
  };
}

export interface Program<S extends BaseStep> {
  steps: S[];
  title: string;
  pseudocode: string[];
  /** Summary badges (e.g., "Transmission: 0.8ms", "Hops: 3", "Overhead: 58B"). */
  stats: {
    label: string;
    value: string;
    tone?: "signal" | "amber" | "mint" | "coral";
  }[];
}
```

### 2.2 The Unit 1 Engine Matrix

Unit 1 is powered by three versatile archetypes:

| Engine | Primary Canvas | Visual Representation | Unit 1 Use Cases |
| :--- | :--- | :--- | :--- |
| **`netEngine`** | `NetworkCanvas` | Graph of nodes (`host`, `switch`, `router`, `tap`, `cloud`), links (`idle`, `active`, `reserved`, `congested`, `down`), and flying packets ($t \in [0, 1]$). Multi-panel support. | Intro to Networks, PAN/LAN/MAN/WAN, Topologies, Failure Comparison, Circuit vs Packet Switching. |
| **`layerEngine`** | `LayerCanvas` | Mirrored vertical layer stacks (Sender down, Receiver up, Wire at bottom), dynamic PDU wrapping/unwrapping, byte headers, ASCII-to-bit serialization. | OSI 7-Layer Model, Encapsulation / Decapsulation, TCP/IP 4-Layer Model. |
| **`signalEngine`** | `SignalCanvas` + `DelayTimeline` + `MediaCanvas` | Pipes where width = bandwidth ($R$) and length = distance/propagation ($d/s$), stacked delay breakdown bars, bit waveforms (NRZ/Manchester), fiber TIR ray optics, antenna wave propagation. | Transmission vs Propagation Delay, Queuing & Processing, Bandwidth vs Latency, Signal Basics, Guided & Unguided Media. |

---

## 3. Chalk & Talk Design System & UI Specifications

All visualizer components must adhere to the **Chalk & Talk** design language:

### 3.1 Color Palette Tokens (`lib/palette.ts`)

```typescript
export const PALETTE = {
  data: "#F0D264",      // Chalk Yellow  -> Data packets, payload, primary signal
  control: "#F0A868",   // Chalk Orange  -> Control plane, ACK, routing decision, token
  ok: "#B9E39A",        // Chalk Green   -> Delivered, checksum valid, link UP, 0 errors
  fail: "#E39AA6",      // Chalk Coral   -> Packet drop, collision, link cut, bit error
  note: "#8FCBE0",      // Chalk Blue    -> Teacher's voice, annotations, protocol asides
  protocol: "#C9A8F5",  // Chalk Violet  -> OSI layers, encapsulation headers, propagation
  wire: "#6E8F82",      // Faint Green   -> Idle transmission link / medium
  board: "#16342A",     // Deep Slate    -> Primary chalkboard background
  boardDeep: "#12291F", // Dark Slate    -> Sunken panels and inputs
  chalk: "#F3F1E7",     // Off-white     -> Primary text, chalk markings
  muted: "#9FB3AA",     // Muted Slate   -> Secondary labels, inactive wires
} as const;
```

### 3.2 Typography Rules
1. **Human / Teacher Voice (`font-hand` - Kalam / Caveat):** Used for titles, instructor notes, step explanations, badges, and button labels. Gives the feel of a professor writing on a blackboard.
2. **Machine / Network Data (`font-mono` - JetBrains Mono):** Used for IP addresses, MAC addresses, port numbers, bit strings, byte counts, delay numbers, and pseudocode. **Never** mix these roles.

### 3.3 Surface & Border Physics
- Outer cards, sidebars, and control panels use `border-[1.5px] border-dashed border-outline-variant`.
- Nodes, chips, and packet rings maintain solid circular or pill borders (`rounded-full`, `rounded-lg`).
- Spring physics: `{ type: "spring", stiffness: 190, damping: 24 }` for smooth layout morphing.

---

## 4. Master Prompt Template for Building Any Leaf

When issuing a generation prompt for any missing Unit 1 leaf or feature, use the following standardized prompt template:

```markdown
You are an expert Computer Networks professor and senior frontend engineer building an interactive visualizer for the topic "[TOPIC_NAME]" (Slug: `[SLUG]`, Route: `[ROUTE_PATH]`) in the `cn_visualizer` Next.js codebase.

Follow the project's "Chalk & Talk" design system and 4-tier pure-engine architecture.

### Requirements for this Topic:
1. **Engine Operation (`engines/[ENGINE_NAME].ts`):**
   - Add/extend the pure function `run[OP_NAME](params, faults): Program<Step>`.
   - Implement complete, accurate physics/networking logic: [SPECIFY FORMULAS & MECHANISMS].
   - Generate discrete, scrubbable animation steps covering: [LIST PHASES].
   - Provide detailed, engaging `description` strings in the Teacher's voice (👨‍🏫) for every frame.
   - Sync step highlights with `codeLines` in the `pseudocode` algorithm block.
   - Compute real-time `stats` badges reflecting actual mathematical properties.

2. **Fault Injection (`Fault[]`):**
   - Support realistic failure modes: [SPECIFY FAULTS, e.g., cut link, packet drop, bit corruption, queue overflow].
   - Ensure the simulation handles faults gracefully and visually explains the consequence.

3. **Sidebar Controls (`components/visualizer/[SIDEBAR_NAME].tsx`):**
   - Provide live parameter controls (not fixed presets!): [LIST INPUTS, e.g., packet count, host count, message text, distance, bandwidth].
   - Add a "Faults" section with intuitive toggle switches/buttons to break the network.

4. **Page Component (`app/[ROUTE_PATH]/page.tsx`):**
   - Render the appropriate `[ENGINE_SCREEN]` with `path`, `title`, `blurb`, and `operation`.

5. **Curriculum Metadata (`data/curriculum.ts`):**
   - Ensure the topic is marked as `status: "available"` with updated stats badges.
```

---

## 5. Exhaustive Technical Specifications: All 7 Categories & 30 Leaves

Below is the complete pedagogical, algorithmic, and visual specification for every leaf in Unit 1.

---

### Category 1: Introduction to Networks (`/topics/fundamentals/introduction`)

```
introduction/
└── what-is-a-network/          (netEngine — 2 hosts, 1 switch/link, packet lifecycle)
```

#### 5.1.1 `what-is-a-network` — What Is a Computer Network?
- **Route:** `/topics/fundamentals/introduction/what-is-a-network`
- **Engine:** `netEngine` (`op: "introNetwork"`)
- **Visual Setup:** Host A (Sender, Alice) on left, Network Cloud / Switch in center, Host B (Receiver, Bob) on right. A dynamic data input box allows typing a message (e.g. `"HELLO"`).
- **Core Concept:** A network is a collection of nodes interconnected by transmission links that exchange information through discrete packets, protocol encapsulation, and physical medium transmission.
- **Parametric Inputs:**
  - `message`: Custom string (default: `"HELLO"`).
  - `packetSize`: 1 to 4 characters per packet (demonstrates segmentation).
  - `linkMedium`: `"copper"` | `"fiber"` | `"wireless"`.
- **Faults Supported:**
  - `linkDown`: Sever the link between Sender and Switch or Switch and Receiver.
  - `packetLoss`: Drop a packet mid-flight in the switch buffer.
- **Animation Sequence (Frames):**
  1. *Idle State:* Host A holds raw user data in Application memory.
  2. *Packetization:* Data is chopped into numbered packets (`P1: "HE"`, `P2: "LL"`, `P3: "O"`). Header attached with `src: Host_A`, `dst: Host_B`.
  3. *NIC Serialization:* Packet $P1$ leaves Host A NIC onto the physical link as electrical/optical signals ($t=0 \to 1$).
  4. *Intermediate Processing:* Switch receives $P1$, inspects destination header, checks lookup table, and places it in output queue.
  5. *Hop 2 Transmission:* $P1$ moves from Switch to Host B while $P2$ begins transmission from Host A (pipeline parallelism).
  6. *Arrival & Buffering:* Host B receives packets in buffer, checks FCS checksum (valid $\to$ mint glow).
  7. *Reassembly:* Host B strips headers, reassembles payload pieces into `"HELLO"`, and delivers to application.
- **Teacher's Notes (Key Frames):**
  - Frame 1: *"A computer network isn't just cables — it is an agreement on how to chop data, address it, push bits across physical matter, and glue it back together at the destination."*
  - Frame 2: *"Large data cannot travel in one giant blob without monopolizing the wire. We fragment it into discrete packets with headers."*
  - Frame 6: *"If any bit flips on the wire, the receiver's checksum fails and the damaged packet is dropped."*
- **Stats Badges:**
  - `Packets`: `3 packets`
  - `Payload`: `5 Bytes`
  - `Total Transmitted`: `192 Bytes (with headers)`
  - `Efficiency`: `2.6% payload ratio`

---

### Category 2: Network Types by Scale (`/topics/fundamentals/network-types`)

```
network-types/
├── pan/                        (netEngine — 10m radius, Bluetooth/Zigbee, phone + peripherals)
├── lan/                        (netEngine — 100m–1km, Ethernet switch, PCs + printer + server)
├── man/                        (netEngine — 10km–50km, City campus mesh, optical ring)
├── wan/                        (netEngine — 10,000km, Global routers, submarine cables, ISP tier 1)
└── scale-comparison/           (netEngine — Continuous interactive zoom from PAN to WAN)
```

#### 5.2.1 `pan` — Personal Area Network
- **Route:** `/topics/fundamentals/network-types/pan`
- **Engine:** `netEngine` (`op: "typePan"`)
- **Visual Setup:** Central Smartphone at $(50, 50)$ surrounded by Smartwatch, Wireless Earbuds, Laptop, and Smart Scale within a 10-meter animated wireless beacon perimeter.
- **Pedagogical Focus:** Ultra-short range ($<10\text{ m}$), low power (BLE, Zigbee), master-slave piconet, ad-hoc discovery.
- **Interactive Controls:** Toggle active peripheral (Earbuds vs Smartwatch vs Laptop), toggle Bluetooth power level (Low: $2\text{ m}$, Medium: $10\text{ m}$, High: $30\text{ m}$).
- **Faults:** `interference` (Microwave/2.4GHz Wi-Fi noise drops packets), `outOfRange` (Move peripheral outside BLE radius).

#### 5.2.2 `lan` — Local Area Network
- **Route:** `/topics/fundamentals/network-types/lan`
- **Engine:** `netEngine` (`op: "typeLan"`)
- **Visual Setup:** Central 8-port Ethernet switch connected to 4 Office Workstations, 1 Network Laser Printer, and 1 Local File Server. Displays MAC table under canvas.
- **Pedagogical Focus:** High data rate ($1\text{ Gbps} - 10\text{ Gbps}$), single broadcast domain, private ownership, negligible latency ($<1\text{ ms}$).
- **Interactive Controls:** Select Source Host and Target (e.g. PC-1 sending print job to Printer or fetching file from Server).

#### 5.2.3 `man` — Metropolitan Area Network
- **Route:** `/topics/fundamentals/network-types/man`
- **Engine:** `netEngine` (`op: "typeMan"`)
- **Visual Setup:** City map graphic showing 4 distinct campus sites (North Campus, Downtown Office, University Hospital, Data Center) joined by an optical fiber ring / MAN backbone with edge routers.
- **Pedagogical Focus:** $5 - 50\text{ km}$ radius, municipal or enterprise dark fiber, intermediate latency ($2 - 10\text{ ms}$), high bandwidth.

#### 5.2.4 `wan` — Wide Area Network
- **Route:** `/topics/fundamentals/network-types/wan`
- **Engine:** `netEngine` (`op: "typeWan"`)
- **Visual Setup:** Global continental map showing nodes in New York, London, Tokyo, Mumbai, and Sydney interconnected by undersea cables and satellite hops with Autonomous System (AS) borders.
- **Pedagogical Focus:** Unlimited geographical span, multi-carrier leased infrastructure, routing via BGP, high propagation delay ($50 - 300\text{ ms}$), packet fragmentation across MTU boundaries.

#### 5.2.5 `scale-comparison` — Scale Comparison: From Room to Planet
- **Route:** `/topics/fundamentals/network-types/scale-comparison`
- **Engine:** `netEngine` (`op: "typeComparison"`)
- **Visual Setup:** 4-panel grid or dynamic zoom-slider showing PAN $\to$ LAN $\to$ MAN $\to$ WAN with identical data transmission, highlighting the exponential increase in distance, hops, delay, and management complexity.
- **Key Metrics Compared Live:**
  - Coverage Radius ($10^1\text{ m} \to 10^3\text{ m} \to 10^5\text{ m} \to 10^7\text{ m}$).
  - Latency ($0.01\text{ ms} \to 0.5\text{ ms} \to 5\text{ ms} \to 150\text{ ms}$).
  - Data Rates & Error Rates.

---

### Category 3: Network Topologies (`/topics/fundamentals/topologies`)

```
topologies/
├── bus/                        (netEngine — Shared coaxial backbone, BNC taps, terminators)
├── star/                       (netEngine — Central switch/hub, dedicated point-to-point links)
├── ring/                       (netEngine — Token passing closed ring, dual counter-rotating ring)
├── mesh/                       (netEngine — Full mesh n(n-1)/2 links vs partial mesh)
├── hybrid/                     (netEngine — Star-Bus / Star-Ring enterprise hierarchies)
└── failure-comparison/         (netEngine — 5-up simultaneous topology link failure comparison)
```

#### 5.3.1 `bus` — Bus Topology
- **Route:** `/topics/fundamentals/topologies/bus`
- **Engine:** `netEngine` (`op: "topoBus"`)
- **Mechanics:** 1 shared horizontal trunk backbone with $N$ host drop taps ($N \in [4, 8]$) and $50\Omega$ end terminators.
- **Visual Highlights:**
  - Broadcast propagation: Frame splits left and right along the bus.
  - Unintended recipients inspect MAC header, see mismatch, and drop silently. Target host acknowledges.
  - Signal hits end terminators: Absorbed with green glow.
  - **Fault:** Cut backbone link $\to$ Signal reflects at cut point creating standing wave collision; partitions the network into two isolated islands.

#### 5.3.2 `star` — Star Topology
- **Route:** `/topics/fundamentals/topologies/star`
- **Engine:** `netEngine` (`op: "topoStar"`)
- **Mechanics:** Central device (toggle between Layer 2 Switch vs Dumb Hub) with dedicated radial links to all hosts.
- **Visual Highlights:**
  - Switch Mode: Unicast forwarding using MAC learning table. Only destination link goes active.
  - Hub Mode: Physical layer repeater broadcasts frame to all ports, showing collision domain vulnerability.
  - **Fault:** Cut single host link (only that host is isolated; network continues) vs Central Switch Down (complete Single Point of Failure).

#### 5.3.3 `ring` — Ring Topology & Token Passing
- **Route:** `/topics/fundamentals/topologies/ring`
- **Engine:** `netEngine` (`op: "topoRing"`)
- **Mechanics:** Circular unidirectional or bidirectional loop with circulating 3-byte Token (`TOKEN`).
- **Visual Highlights:**
  - Free Token circulates idle (amber glow).
  - Sender captures token, changes state to busy, appends data frame, and transmits downstream.
  - Intermediate nodes repeat frame. Receiver reads data, flips address-recognized and frame-copied bits, forwards back to sender.
  - Sender drains frame from ring and releases fresh free token.
  - **Fault:** Single link break in unidirectional ring halts entire ring; dual-counter rotating ring loops back (beaconing) to self-heal.

#### 5.3.4 `mesh` — Mesh Topology (Full vs Partial)
- **Route:** `/topics/fundamentals/topologies/mesh`
- **Engine:** `netEngine` (`op: "topoMesh"`)
- **Mechanics:** Full Mesh formula $L = \frac{N(N-1)}{2}$ links. For 6 hosts = 15 physical links.
- **Visual Highlights:**
  - Direct 1-hop transmission between any pair ($O(1)$ latency).
  - Cut 1, 2, or 3 links: Engine runs BFS and dynamically recalculates alternate 2-hop/3-hop detour routes in real time.
  - Visual comparison badge: Full mesh cable cost ($O(N^2)$) vs Star ($O(N)$).

#### 5.3.5 `hybrid` — Hybrid Topology
- **Route:** `/topics/fundamentals/topologies/hybrid`
- **Engine:** `netEngine` (`op: "topoHybrid"`)
- **Mechanics:** Two distinct Star clusters (e.g., Engineering Dept & Marketing Dept) joined via a redundant backbone trunk link.
- **Visual Highlights:** Inter-departmental traffic flows across the trunk link; intra-departmental traffic stays local to the department switch.

#### 5.3.6 `failure-comparison` — 5-Up Failure Comparison
- **Route:** `/topics/fundamentals/topologies/failure-comparison`
- **Engine:** `netEngine` (`op: "topoFailure"`)
- **Mechanics:** 5 mini-canvases rendered simultaneously (Bus, Star, Ring, Mesh, Hybrid). The user severs one equivalent link across all five.
- **Verdict & Scorecard:**
  - Bus: **Partitioned** (2 isolated halves).
  - Star: **Survives** (only the severed host goes down).
  - Ring: **Dead** (token circulation broken unless dual-ring).
  - Mesh: **Survives** (100% connectivity preserved via alternate mesh edge).
  - Hybrid: **Partial Survival** (Intra-cluster works, inter-cluster severed).

---

### Category 4: Switching Techniques (`/topics/fundamentals/switching`)

```
switching/
├── circuit-switching/          (netEngine — 3-phase dedicated path reservation & teardown)
├── packet-switching/           (netEngine — Datagram / VC, statistical multiplexing, out-of-order)
└── circuit-vs-packet/          (netEngine — Direct side-by-side race with bursty vs continuous data)
```

#### 5.4.1 `circuit-switching` — Circuit Switching (PSTN / Dedicated Channel)
- **Route:** `/topics/fundamentals/switching/circuit-switching`
- **Engine:** `netEngine` (`op: "switchCircuit"`)
- **Visual Setup:** $3 \times 3$ grid of telephone/circuit switches between Sender A and Receiver B.
- **Key Concepts:**
  1. *Phase 1 (Circuit Setup):* Setup probe packet locks dedicated physical bandwidth on switches along path $A \to S_1 \to S_4 \to S_5 \to B$. Links turn amber dashed $\to$ solid reserved yellow.
  2. *Phase 2 (Data Transfer):* Continuous stream flows without headers or per-packet queue delay. Fixed propagation and transmission.
  3. *Phase 3 (Teardown):* Release signal tears down circuit; capacity freed.
  4. *Idle Waste Demonstration:* Pause data transmission $\to$ Show locked capacity sitting 100% idle while blocking another connection request.

#### 5.4.2 `packet-switching` — Packet Switching (Datagram & Virtual Circuit)
- **Route:** `/topics/fundamentals/switching/packet-switching`
- **Engine:** `netEngine` (`op: "switchPacket"`)
- **Visual Setup:** Mesh of 6 store-and-forward routers.
- **Key Concepts:**
  - Message broken into $P_1, P_2, P_3, P_4$.
  - *Independent Routing:* Router 1 is congested, so $P_1$ goes via top path ($R_1 \to R_2 \to R_5$), while $P_2$ takes bottom path ($R_1 \to R_3 \to R_4 \to R_5$).
  - *Out-of-order Arrival:* $P_2$ arrives before $P_1$. Receiver reassembly buffer sorts by Sequence Number before passing to application.
  - *Statistical Multiplexing:* Packets from multiple flows interleave on the same physical link on demand.

#### 5.4.3 `circuit-vs-packet` — Circuit vs Packet Switching Showdown
- **Route:** `/topics/fundamentals/switching/circuit-vs-packet`
- **Engine:** `netEngine` (`op: "switchComparison"`)
- **Visual Setup:** Two parallel tracks running identical messages under two traffic profiles:
  - Profile A: **Continuous Stream** (e.g., Uncompressed Audio Call). Circuit switching wins after setup overhead.
  - Profile B: **Bursty Web Traffic** (e.g., Web browsing with pauses). Packet switching achieves $3.8\times$ higher link utilization and allows 10 users on a link that supports only 2 circuit users.

---

### Category 5: Layered Architecture & Models (`/topics/fundamentals/layering`)

```
layering/
├── osi-model/                  (layerEngine — 7-layer vertical stack inspection & layer duties)
├── encapsulation/              (layerEngine — Interactive PDU encapsulation & decapsulation)
└── tcp-ip-model/               (layerEngine — 4-layer DoD model mapped side-by-side to OSI)
```

#### 5.5.1 `osi-model` — The 7-Layer OSI Reference Model
- **Route:** `/topics/fundamentals/layering/osi-model`
- **Engine:** `layerEngine` (`op: "osiModel"`)
- **Visual Setup:** 7 distinct interactive layer lanes:
  7. **Application:** HTTP, FTP, SMTP, DNS (Interface to user).
  6. **Presentation:** Encryption (TLS), Compression, ASCII/UTF translation.
  5. **Session:** Dialog control, token management, synchronization checkpoints.
  4. **Transport:** End-to-end reliability, segmentation, port numbers (TCP/UDP).
  3. **Network:** Logical IP addressing, routing across internetworks.
  2. **Data Link:** Framing, physical MAC addressing, hop-to-hop error detection (CRC).
  1. **Physical:** Transmission of raw unformatted bitstream over physical medium.
- **Interaction:** Clicking any layer spotlights its responsibilities, PDU name, real protocols, and associated hardware (Gateway, Router, Switch, NIC, Repeater).

#### 5.5.2 `encapsulation` — Encapsulation & Decapsulation
- **Route:** `/topics/fundamentals/layering/encapsulation`
- **Engine:** `layerEngine` (`op: "encapsulation"`)
- **Visual Setup:** Two 7-layer towers (Sender on left, Receiver on right) with a physical cable at the bottom.
- **Dynamic Calculation:**
  - User enters message: `"HELLO"` (5 bytes).
  - Layer 4 adds TCP header ($+20\text{ B}$ with ports `51032 -> 80`).
  - Layer 3 adds IP header ($+20\text{ B}$ with IPs `10.0.0.5 -> 10.0.0.9`).
  - Layer 2 adds Ethernet MAC header ($+14\text{ B}$) and FCS trailer ($+4\text{ B}$).
  - Ethernet minimum payload enforcement: If data $< 46\text{ B}$, add padding. Total frame on wire $= 64\text{ Bytes}$.
  - Physical layer: Converts 64 bytes into 512 binary bits (`01001000 01000101...`).
  - Receiver climbs up, stripping and verifying each header layer-by-layer.

#### 5.5.3 `tcp-ip-model` — TCP/IP 4-Layer Architecture vs OSI
- **Route:** `/topics/fundamentals/layering/tcp-ip-model`
- **Engine:** `layerEngine` (`op: "tcpIpModel"`)
- **Visual Setup:** Side-by-side mapping diagram showing OSI 7 Layers mapping to TCP/IP 4 Layers:
  - OSI (7, 6, 5) $\implies$ TCP/IP **Application Layer** (HTTP, DNS, SSH, BGP).
  - OSI (4) $\implies$ TCP/IP **Transport Layer** (TCP, UDP).
  - OSI (3) $\implies$ TCP/IP **Internet Layer** (IPv4, IPv6, ICMP, ARP).
  - OSI (2, 1) $\implies$ TCP/IP **Network Access Layer** (Ethernet, Wi-Fi, DOCSIS).
- **Core Contrast:** Protocol-first (TCP/IP) vs Model-first (OSI). Shows why the real internet runs on 4 pragmatic layers.

---

### Category 6: Latency, Bandwidth & Delay (`/topics/fundamentals/performance`)

```
performance/
├── transmission-delay/         (signalEngine — L / R bit clocking at NIC serializer)
├── propagation-delay/          (signalEngine — d / s physical flight time through medium)
├── queuing-and-processing/     (signalEngine — Router buffer occupancy, drops & CPU lookup)
└── bandwidth-vs-latency/       (signalEngine — Dual pipe simulator & stacked delay chart)
```

#### 5.6.1 `transmission-delay` — Transmission Delay ($d_{\text{trans}} = \frac{L}{R}$)
- **Route:** `/topics/fundamentals/performance/transmission-delay`
- **Engine:** `signalEngine` (`op: "transmissionDelay"`)
- **Core Principle:** The time required to push/serialize all of the packet's bits onto the physical transmission medium. Depends **strictly** on packet length $L$ (bits) and link bandwidth $R$ (bps).
- **Visual Setup:** A packet being pushed bit-by-bit through a Network Interface Card (NIC) serializer clock.
- **Interactive Controls:**
  - Packet Size $L$: $64\text{ B}$ (VoIP) to $1500\text{ B}$ (Standard MTU) to $9000\text{ B}$ (Jumbo Frame).
  - Link Rate $R$: $10\text{ Mbps}$ (10BASE-T) to $1\text{ Gbps}$ to $100\text{ Gbps}$.
- **Formula Live Calculation:**
  $$d_{\text{trans}} = \frac{L}{R}$$
  Example: $1500\text{ B} \times 8 = 12000\text{ bits} / 1\text{ Gbps} = 0.012\text{ ms} = 12\ \mu\text{s}$.

#### 5.6.2 `propagation-delay` — Propagation Delay ($d_{\text{prop}} = \frac{d}{s}$)
- **Route:** `/topics/fundamentals/performance/propagation-delay`
- **Engine:** `signalEngine` (`op: "propagationDelay"`)
- **Core Principle:** The time it takes for one bit to physically travel from the start of the medium to the end. Depends **strictly** on distance $d$ (meters) and wave propagation speed $s$ ($2 \times 10^8\text{ m/s}$ in copper/fiber, $3 \times 10^8\text{ m/s}$ in vacuum/air).
- **Visual Setup:** A single pulse traveling down an intercontinental fiber cable or satellite uplink.
- **Formula Live Calculation:**
  $$d_{\text{prop}} = \frac{d}{s}$$
  Example: $4000\text{ km} / (2 \times 10^8\text{ m/s}) = 20\text{ ms}$.

#### 5.6.3 `queuing-and-processing` — Queuing & Processing Delay
- **Route:** `/topics/fundamentals/performance/queuing-and-processing`
- **Engine:** `signalEngine` (`op: "queuingProcessing"`)
- **Visual Setup:** Router architecture showing Ingress Port $\to$ FIFO Queue Buffer $\to$ Route Processor CPU $\to$ Egress Port.
- **Mechanics:**
  - $d_{\text{proc}}$: Fixed $5 - 50\ \mu\text{s}$ for IP header checksum calculation and routing table prefix lookup.
  - $d_{\text{queue}}$: Variable dynamic delay based on arrival rate $\lambda$ and transmission rate $\mu$.
  - Traffic intensity parameter $I = \frac{L\lambda}{R}$. When $I \to 1$, queue delay explodes to infinity.
  - When queue capacity (e.g. 10 packets) is exceeded: Trigger **Tail Drop** packet loss (coral glow).

#### 5.6.4 `bandwidth-vs-latency` — Bandwidth vs Latency: The Pipe Simulator
- **Route:** `/topics/fundamentals/performance/bandwidth-vs-latency`
- **Engine:** `signalEngine` (`op: "bandwidthVsLatency"`)
- **Flagship Visualizer:** Two parallel pipes racing the exact same file:
  - **Pipe A (Ground Fiber):** $100\text{ Mbps}$, $2\text{ ms}$ propagation delay.
  - **Pipe B (Geostationary Satellite):** $100\text{ Mbps}$, $300\text{ ms}$ propagation delay.
- **The Core "Aha!" Moment:**
  - Send $10\text{ KB}$ Web Page: Fiber completes in $2.8\text{ ms}$; Satellite takes $300.8\text{ ms}$ ($107\times$ slower!). High bandwidth is useless because propagation dominates.
  - Send $100\text{ MB}$ Movie: Fiber takes $8.002\text{ s}$; Satellite takes $8.300\text{ s}$ (Virtually identical!). Transmission dominates; propagation becomes negligible.
- **Delay-Bandwidth Product (BDP):** Visualizes the volume of the pipe ($BDP = R \times d_{\text{prop}}$). Shows how many bits can be in-flight in the wire simultaneously.

---

### Category 7: Transmission Media (`/topics/fundamentals/transmission-media`)

```
transmission-media/
├── signal-basics/              (signalEngine — Digital NRZ/Manchester vs Analog Modulation)
├── guided/
│   ├── twisted-pair/           (mediaCanvas — UTP/STP twist cancellation of EMI crosstalk)
│   ├── coaxial/                (mediaCanvas — Core, dielectric, copper braid shielding)
│   └── fiber-optic/            (mediaCanvas — Core/cladding Snell's Law & Total Internal Reflection)
├── unguided/
│   ├── radio-waves/            (mediaCanvas — Omnidirectional, ground wave, ionospheric reflection)
│   ├── microwaves/             (mediaCanvas — Line-of-sight parabolic dish beam & atmospheric fade)
│   └── infrared/               (mediaCanvas — Direct line-of-sight, non-penetrating short range)
└── media-comparison/           (signalEngine — Multi-attribute dynamic radar & benchmark matrix)
```

#### 5.7.1 `signal-basics` — Signal Encoding & Digital vs Analog
- **Route:** `/topics/fundamentals/transmission-media/signal-basics`
- **Engine:** `signalEngine` (`op: "signalBasics"`)
- **Visual Setup:** Interactive waveform generator.
- **Modes:**
  1. *NRZ-L (Non-Return to Zero):* High voltage $= 1$, Low voltage $= 0$. Shows baseline wander and clock synchronization loss on long strings of zeros.
  2. *Manchester Encoding:* Bit 0 is High-to-Low transition; Bit 1 is Low-to-High transition. Self-clocking on every bit.
  3. *Carrier Modulation (Analog):* Amplitude Modulation (AM), Frequency Modulation (FM), and Phase Shift Keying (BPSK/QAM).

#### 5.7.2 `guided/twisted-pair` — Twisted Pair Cable (UTP / STP)
- **Route:** `/topics/fundamentals/transmission-media/guided/twisted-pair`
- **Engine:** `mediaEngine` (`op: "guidedTwistedPair"`)
- **Physics Visualization:** Two copper wires carrying differential signals ($+V$ and $-V$).
- **The Twist Mechanism:** An external noise source (motor/spark) injects equal electromagnetic interference into both wires. At the receiver, differential amplifier calculates:
  $$(+V + \text{Noise}) - (-V + \text{Noise}) = 2V$$
  Noise is perfectly canceled! Slider adjusts twist rate (twists per meter) showing how tighter twists reject higher frequency noise.

#### 5.7.3 `guided/coaxial` — Coaxial Cable
- **Route:** `/topics/fundamentals/transmission-media/guided/coaxial`
- **Engine:** `mediaEngine` (`op: "guidedCoaxial"`)
- **Cutaway 3D/2D Layer Diagram:**
  1. Center Copper Core (carries high-frequency signal).
  2. Dielectric Insulator (maintains constant spacing).
  3. Metallic Braided Shield (Faraday cage that absorbs external EMI).
  4. Outer Plastic Jacket.
- **Use Cases:** Cable TV, DOCSIS Internet, legacy 10BASE2/10BASE5 Ethernet.

#### 5.7.4 `guided/fiber-optic` — Optical Fiber & Total Internal Reflection (TIR)
- **Route:** `/topics/fundamentals/transmission-media/guided/fiber-optic`
- **Engine:** `mediaEngine` (`op: "guidedFiber"`)
- **Ray Optics Simulation:**
  - Glass Core (refractive index $n_1 \approx 1.48$) and Cladding ($n_2 \approx 1.46$).
  - Critical Angle formula:
    $$\theta_c = \arcsin\left(\frac{n_2}{n_1}\right) \approx 80.6^\circ$$
  - User drags light injection angle:
    - Angle $< \theta_c$: Refracts out into cladding $\to$ Signal lost (red pulse).
    - Angle $\ge \theta_c$: **Total Internal Reflection** $\to$ Light ray bounces endlessly down the core without loss (mint pulse).
  - Mode toggle: **Single-Mode Fiber (SMF)** (8 $\mu$m core, zero modal dispersion, $100\text{ km}$ reach) vs **Multi-Mode Fiber (MMF)** (50 $\mu$m core, modal dispersion, $500\text{ m}$ reach).

#### 5.7.5 `unguided/radio-waves` — Radio Waves ($3\text{ kHz} - 1\text{ GHz}$)
- **Route:** `/topics/fundamentals/transmission-media/unguided/radio-waves`
- **Engine:** `mediaEngine` (`op: "unguidedRadio"`)
- **Wave Propagation Modes:**
  - *Ground Wave ($<2\text{ MHz}$):* Follows Earth's curvature (AM radio).
  - *Sky Wave ($2 - 30\text{ MHz}$):* Bounces between Earth and Ionosphere (Shortwave).
  - *Space Wave ($>30\text{ MHz}$):* Line-of-sight and building penetration (FM radio, Cellular, Wi-Fi).

#### 5.7.6 `unguided/microwaves` — Terrestrial & Satellite Microwaves ($1\text{ GHz} - 300\text{ GHz}$)
- **Route:** `/topics/fundamentals/transmission-media/unguided/microwaves`
- **Engine:** `mediaEngine` (`op: "unguidedMicrowave"`)
- **Visual Setup:** Directional parabolic horn/dish antennas.
- **Key Constraints:**
  - Line-of-Sight requirement (Earth curvature limits relay towers to $\sim 50\text{ km}$).
  - Atmospheric attenuation and **Rain Fade** simulation (user toggles rain intensity $\to$ signal drops).
  - Geostationary Orbit ($35,786\text{ km}$) delay simulation ($250 - 300\text{ ms}$ round trip).

#### 5.7.7 `unguided/infrared` — Infrared Waves ($300\text{ GHz} - 400\text{ THz}$)
- **Route:** `/topics/fundamentals/transmission-media/unguided/infrared`
- **Engine:** `mediaEngine` (`op: "unguidedInfrared"`)
- **Key Constraints:** High frequency, cannot penetrate solid walls (inherent room security, zero interference with neighbor's TV remote or IrDA transceiver).

#### 5.7.8 `media-comparison` — Master Media Benchmark & Radar Comparison
- **Route:** `/topics/fundamentals/transmission-media/media-comparison`
- **Engine:** `signalEngine` (`op: "mediaComparison"`)
- **Visual Setup:** Comprehensive interactive comparison table and dynamic 6-axis Radar Chart comparing:
  1. Twisted Pair (Cat 6A)
  2. Coaxial Cable (RG-6)
  3. Optical Fiber (Single Mode)
  4. Terrestrial Microwave
  5. Satellite Link
  6. Wi-Fi 6E (Radio)
- **Evaluation Axes:** Bandwidth Capacity, Max Unrepeated Distance, EMI Immunity, Physical Security, Installation/Maintenance Cost, Propagation Latency.

---

## 6. Implementation Plan & Directory Structure

To fulfill all 30 leaves for Unit 1, the codebase directory tree will be fully structured as follows:

```
app/
└── topics/
    └── fundamentals/
        ├── page.tsx                                  // Unit 1 Hub Page
        ├── introduction/
        │   ├── page.tsx
        │   └── what-is-a-network/page.tsx
        ├── network-types/
        │   ├── page.tsx
        │   ├── pan/page.tsx
        │   ├── lan/page.tsx
        │   ├── man/page.tsx
        │   ├── wan/page.tsx
        │   └── scale-comparison/page.tsx
        ├── topologies/
        │   ├── page.tsx
        │   ├── bus/page.tsx
        │   ├── star/page.tsx
        │   ├── ring/page.tsx
        │   ├── mesh/page.tsx
        │   ├── hybrid/page.tsx
        │   └── failure-comparison/page.tsx
        ├── switching/
        │   ├── page.tsx
        │   ├── circuit-switching/page.tsx
        │   ├── packet-switching/page.tsx
        │   └── circuit-vs-packet/page.tsx
        ├── layering/
        │   ├── page.tsx
        │   ├── osi-model/page.tsx
        │   ├── encapsulation/page.tsx
        │   └── tcp-ip-model/page.tsx
        ├── performance/
        │   ├── page.tsx
        │   ├── transmission-delay/page.tsx
        │   ├── propagation-delay/page.tsx
        │   ├── queuing-and-processing/page.tsx
        │   └── bandwidth-vs-latency/page.tsx
        └── transmission-media/
            ├── page.tsx
            ├── signal-basics/page.tsx
            ├── guided/
            │   ├── page.tsx
            │   ├── twisted-pair/page.tsx
            │   ├── coaxial/page.tsx
            │   └── fiber-optic/page.tsx
            ├── unguided/
            │   ├── page.tsx
            │   ├── radio-waves/page.tsx
            │   ├── microwaves/page.tsx
            │   └── infrared/page.tsx
            └── media-comparison/page.tsx
```

---

## 7. Verification & Quality Rubric

Every visualizer implemented must pass this quality checklist before deployment:

1. **Deterministic Scrubbing:** Moving the scrubber slider back and forth must yield identical visual states without UI glitches or dropped frames.
2. **Dynamic Responsiveness:** All SVGs and visualizer stages must fit seamlessly inside `FitStage` on screens from $360\text{px}$ mobile to $4\text{K}$ ultrawide displays.
3. **Parametric Calculations:** Math must be physically and logically authentic (e.g. realistic speeds of light in copper vs vacuum, accurate header byte sizes, true BFS shortest path calculations).
4. **Pedagogical Clarity:** The Teacher's Note (👨‍🏫) must explain *why* something happens in accessible, vivid language.
5. **No Placeholders or Dead Ends:** Every single leaf must be a fully working interactive application with live inputs, working faults, and bidirectional navigation (`LeafNav`).

---

*This blueprint serves as the official specification for completing the Unit 1 Computer Networks visualizer.*
