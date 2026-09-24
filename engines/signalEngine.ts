// ---------------------------------------------------------------------------
// signalEngine — links drawn as pipes.
//
// The metaphor the whole unit hangs on: a pipe's THICKNESS is bandwidth and its
// LENGTH is propagation delay. Pour the same file into two differently-shaped
// pipes and the answer to "why is my fast connection slow?" is visible without
// a word of explanation.
//
// Both links are fully editable — bandwidth, distance and file size — so this
// stops being a demo and becomes a calculator you can put your own homework
// numbers into. The maths is real: transmission is bits ÷ bandwidth,
// propagation is a fixed flight time, and the totals are what you would
// actually measure.
// ---------------------------------------------------------------------------

import type { DelaySeg, SignalProgram, SignalStep, SignalTrack } from "@/types/visualization";
import { ask, tag } from "./lessonKit.ts";

/** Fixed router cost applied to both paths, so all four delay types appear. */
const QUEUE_MS = 1.2;
const PROC_MS = 0.4;
const START_MS = QUEUE_MS + PROC_MS;

export interface LinkSpec {
  label: string;
  bandwidthMbps: number;
  propagationMs: number;
}

export interface SignalRunParams {
  fileKB: number;
  a: LinkSpec;
  b: LinkSpec;
}

export const SIGNAL_DEFAULTS: SignalRunParams = {
  fileKB: 10,
  a: { label: "Fibre", bandwidthMbps: 100, propagationMs: 2 },
  b: { label: "Satellite", bandwidthMbps: 100, propagationMs: 300 },
};

/** One-click media presets — pick a medium, then edit the numbers if you like. */
export const LINK_PRESETS: (LinkSpec & { hint: string })[] = [
  { label: "LAN", bandwidthMbps: 1000, propagationMs: 0.05, hint: "same building, gigabit" },
  { label: "Fibre", bandwidthMbps: 100, propagationMs: 2, hint: "~400 km of ground fibre" },
  { label: "DSL", bandwidthMbps: 8, propagationMs: 15, hint: "copper to the exchange" },
  { label: "Satellite", bandwidthMbps: 100, propagationMs: 300, hint: "geostationary, 2 × 36 000 km" },
];

export const FILE_PRESETS = [
  { kb: 10, label: "10 KB", what: "a web page" },
  { kb: 1024, label: "1 MB", what: "a photo" },
  { kb: 102400, label: "100 MB", what: "a video" },
];

export const MIN_KB = 1;
export const MAX_KB = 1024 * 1024; // 1 GB
export const MIN_MBPS = 0.1;
export const MAX_MBPS = 10000;
export const MIN_PROP = 0.01;
export const MAX_PROP = 2000;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function fmtMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  if (ms >= 10) return `${ms.toFixed(1)} ms`;
  return `${ms.toFixed(2)} ms`;
}

export function fmtBits(bits: number): string {
  if (bits >= 8e6) return `${(bits / 8 / 1024 / 1024).toFixed(1)} MB`;
  if (bits >= 8192) return `${(bits / 8 / 1024).toFixed(1)} KB`;
  return `${Math.round(bits / 8)} B`;
}

export function fmtSize(kb: number): string {
  if (kb >= 1024 * 1024) return `${(kb / 1024 / 1024).toFixed(2)} GB`;
  if (kb >= 1024) return `${(kb / 1024).toFixed(kb % 1024 === 0 ? 0 : 1)} MB`;
  return `${kb} KB`;
}

const CODE = [
  "total_delay = queuing + processing + transmission + propagation",
  "",
  "transmission = file_size / bandwidth   -- time to PUSH the bits out",
  "propagation  = distance  / speed       -- time for bits to TRAVEL",
  "",
  "-- your two links --",
  "link A: bandwidth, propagation",
  "link B: bandwidth, propagation",
  "",
  "send the same file down both pipes",
  "compare total_delay",
];

interface Derived extends LinkSpec {
  id: string;
  totalBits: number;
  bpms: number;
  txMs: number;
  finishMs: number;
  tone: SignalTrack["tone"];
}

function derive(p: SignalRunParams): Derived[] {
  const kb = clamp(p.fileKB, MIN_KB, MAX_KB);
  const totalBits = kb * 1024 * 8;
  return [
    { ...p.a, id: "a", tone: "signal" as const },
    { ...p.b, id: "b", tone: "amber" as const },
  ].map((t) => {
    const bw = clamp(t.bandwidthMbps, MIN_MBPS, MAX_MBPS);
    const prop = clamp(t.propagationMs, MIN_PROP, MAX_PROP);
    const bpms = bw * 1000; // Mbps → bits per millisecond
    const txMs = totalBits / bpms;
    return {
      ...t,
      bandwidthMbps: bw,
      propagationMs: prop,
      totalBits,
      bpms,
      txMs,
      finishMs: START_MS + txMs + prop,
    };
  });
}

function sample(d: Derived, t: number): SignalTrack {
  const since = t - START_MS;
  return {
    id: d.id,
    label: d.label,
    sub: `${d.bandwidthMbps} Mbps · ${d.propagationMs} ms one-way`,
    bandwidthMbps: d.bandwidthMbps,
    propagationMs: d.propagationMs,
    frontT: clamp01(since / d.propagationMs),
    tailT: clamp01((since - d.txMs) / d.propagationMs),
    sentBits: clamp01(since / d.txMs) * d.totalBits,
    totalBits: d.totalBits,
    deliveredBits: clamp01((since - d.propagationMs) / d.txMs) * d.totalBits,
    elapsedMs: Math.min(t, d.finishMs),
    finishedMs: t >= d.finishMs ? d.finishMs : undefined,
    tone: d.tone,
  };
}

function segsFor(d: Derived): DelaySeg[] {
  return [
    { kind: "queuing", ms: QUEUE_MS },
    { kind: "processing", ms: PROC_MS },
    { kind: "transmission", ms: d.txMs },
    { kind: "propagation", ms: d.propagationMs },
  ];
}

function bandwidthVsLatency(p: SignalRunParams): SignalProgram {
  const ds = derive(p);
  const [A, B] = ds;
  const sizeLabel = fmtSize(clamp(p.fileKB, MIN_KB, MAX_KB));
  const maxFinish = Math.max(...ds.map((d) => d.finishMs));

  // Whichever link wins, the narration should name the right one.
  const fast = A.finishMs <= B.finishMs ? A : B;
  const slow = fast === A ? B : A;
  const ratio = slow.finishMs / fast.finishMs;
  const sameBandwidth = A.bandwidthMbps === B.bandwidthMbps;

  // Sample the virtual clock where something actually changes, rather than at a
  // fixed cadence — a 300 ms hop would otherwise drown out a 0.8 ms transmission.
  const times = new Set<number>([0, START_MS * 0.6, START_MS]);
  for (const d of ds) {
    times.add(START_MS + d.txMs * 0.5);
    times.add(START_MS + d.txMs);
    times.add(d.finishMs);
  }
  for (let i = 1; i <= 4; i++) times.add(fast.finishMs + ((slow.finishMs - fast.finishMs) * i) / 5);
  const clocks = [...times].filter((t) => t >= 0 && t <= maxFinish).sort((a, b) => a - b);

  const chart = {
    title: "Where the time actually goes",
    maxMs: maxFinish,
    rows: ds.map((d) => ({ label: d.label, segs: segsFor(d), totalMs: d.finishMs })),
  };

  const steps: SignalStep[] = [];

  steps.push({
    tracks: ds.map((d) => sample(d, 0)),
    clockMs: 0,
    chart,
    description: sameBandwidth
      ? `Two links, ${sizeLabel} to send down each. Both run at ${A.bandwidthMbps} Mbps — identical bandwidth, so the pipes are equally THICK. The only difference is length: how far the bits must physically travel.`
      : `Two links, ${sizeLabel} to send down each. ${A.label} is ${A.bandwidthMbps} Mbps over ${A.propagationMs} ms; ${B.label} is ${B.bandwidthMbps} Mbps over ${B.propagationMs} ms. Thicker pipe, or shorter pipe — watch which one actually wins.`,
    codeLines: [6, 7, 8],
  });

  for (const t of clocks) {
    if (t === 0) continue;
    let description: string;
    let codeLines: number[] = [1];
    const bothTxDone = ds.every((d) => t >= START_MS + d.txMs);

    if (t <= START_MS) {
      description = `${fmtMs(t)}. Nothing is moving yet. The packet is sitting in the router's queue and having its header examined — queuing and processing delay, the two components people forget.`;
    } else if (!bothTxDone) {
      description = sameBandwidth
        ? `${fmtMs(t)}. Transmission delay: both interfaces are clocking bits onto the wire at the same rate, because this is the part bandwidth controls.`
        : `${fmtMs(t)}. Transmission delay: ${A.label} needs ${fmtMs(A.txMs)} to push the file out, ${B.label} needs ${fmtMs(B.txMs)}. This is the only part bandwidth controls.`;
      codeLines = [3];
    } else if (t < fast.finishMs) {
      description = `${fmtMs(t)}. Every bit is on the wire — bandwidth's job is finished. Everything from here is pure travel time, and no amount of extra bandwidth would help.`;
      codeLines = [4];
    } else if (t < slow.finishMs) {
      description = `${fmtMs(t)}. ${fast.label} is done — the whole file has landed. ${slow.label} has transmitted every one of its bits too, and is now just waiting for them to arrive.`;
      codeLines = [4, 10];
    } else {
      description = `${fmtMs(t)}. ${slow.label} finally completes, ${ratio.toFixed(ratio >= 10 ? 0 : 2)}× behind.`;
      codeLines = [10, 11];
    }

    steps.push({
      tracks: ds.map((d) => sample(d, t)),
      clockMs: t,
      chart,
      description,
      codeLines,
      message:
        Math.abs(t - fast.finishMs) < 1e-9
          ? { text: `${fast.label} delivered in ${fmtMs(fast.finishMs)}`, tone: "ok" }
          : undefined,
    });
  }

  const close = ratio < 1.5;
  steps.push({
    tracks: ds.map((d) => sample(d, maxFinish)),
    clockMs: maxFinish,
    chart,
    description: close
      ? `At ${sizeLabel} the two links are within ${ratio.toFixed(2)}× of each other. Transmission time now dominates, so bandwidth is what matters and the difference in distance has almost stopped mattering. Shrink the file and the verdict flips.`
      : `${sizeLabel} takes ${fmtMs(fast.finishMs)} on ${fast.label} and ${fmtMs(slow.finishMs)} on ${slow.label} — ${ratio.toFixed(ratio >= 10 ? 0 : 2)}× longer${sameBandwidth ? ", with identical bandwidth" : ""}. Bandwidth sets how much you can push per second; latency sets how long the first byte takes to arrive. Clicking a link is dominated by latency. Try a much larger file — the verdict reverses.`,
    codeLines: [10, 11],
    message: {
      text: close
        ? `Only ${ratio.toFixed(2)}× apart — bandwidth wins at this size`
        : `${slow.label} ${ratio.toFixed(ratio >= 10 ? 0 : 2)}× slower`,
      tone: close ? "ok" : "error",
    },
  });

  return {
    steps,
    title: `Bandwidth vs Latency — ${sizeLabel}`,
    pseudocode: CODE,
    stats: [
      { label: "File", value: sizeLabel, tone: "signal" },
      { label: A.label, value: fmtMs(A.finishMs), tone: A.finishMs <= B.finishMs ? "mint" : "amber" },
      { label: B.label, value: fmtMs(B.finishMs), tone: B.finishMs < A.finishMs ? "mint" : "amber" },
      {
        label: "Gap",
        value: `${ratio.toFixed(ratio >= 10 ? 0 : 2)}×`,
        tone: close ? "mint" : "coral",
      },
    ],
  };
}

// --- operation: Transmission Delay (L / R) ---------------------------------

const TRANS_CODE = [
  "Transmission Delay d_trans = L / R",
  "  L = packet length in bits (e.g. 1500 B * 8 = 12000 bits)",
  "  R = transmission rate of link in bps (e.g. 1 Gbps = 1e9 bps)",
  "NIC clock serializes bits onto physical wire one by one",
  "d_trans depends ONLY on packet size and bandwidth (NOT distance)",
];

function transmissionDelay(p: SignalRunParams): SignalProgram {
  const pSizeB = p.fileKB * 1024;
  const bits = pSizeB * 8;
  const bwA = p.a.bandwidthMbps * 1e6;
  const bwB = p.b.bandwidthMbps * 1e6;
  const txA_ms = (bits / bwA) * 1000;
  const txB_ms = (bits / bwB) * 1000;

  const trackA: SignalTrack = {
    id: "tx-a",
    label: `${p.a.label} (${p.a.bandwidthMbps} Mbps)`,
    sub: `L = ${fmtSize(p.fileKB)} · R = ${p.a.bandwidthMbps} Mbps`,
    bandwidthMbps: p.a.bandwidthMbps,
    propagationMs: 0.1,
    frontT: 1.0,
    tailT: 0.0,
    sentBits: bits,
    totalBits: bits,
    deliveredBits: bits,
    elapsedMs: txA_ms,
    finishedMs: txA_ms,
    tone: "signal",
  };

  const trackB: SignalTrack = {
    id: "tx-b",
    label: `${p.b.label} (${p.b.bandwidthMbps} Mbps)`,
    sub: `L = ${fmtSize(p.fileKB)} · R = ${p.b.bandwidthMbps} Mbps`,
    bandwidthMbps: p.b.bandwidthMbps,
    propagationMs: 0.1,
    frontT: 1.0,
    tailT: 0.0,
    sentBits: bits,
    totalBits: bits,
    deliveredBits: bits,
    elapsedMs: txB_ms,
    finishedMs: txB_ms,
    tone: "amber",
  };

  const steps: SignalStep[] = [
    {
      tracks: [
        { ...trackA, frontT: 0, tailT: 0, sentBits: 0, deliveredBits: 0, elapsedMs: 0 },
        { ...trackB, frontT: 0, tailT: 0, sentBits: 0, deliveredBits: 0, elapsedMs: 0 },
      ],
      clockMs: 0,
      description: `Transmission Delay is the time required for the NIC serializer to push all ${bits.toLocaleString()} bits ($L$) onto the wire at transmission rate $R$. It is completely independent of the distance to the destination.`,
      codeLines: [1, 2, 3],
    },
    {
      tracks: [
        { ...trackA, frontT: 0.5, tailT: 0, sentBits: bits / 2, deliveredBits: 0, elapsedMs: txA_ms / 2 },
        { ...trackB, frontT: 0.5, tailT: 0, sentBits: bits / 2, deliveredBits: 0, elapsedMs: txB_ms / 2 },
      ],
      clockMs: Math.min(txA_ms, txB_ms) / 2,
      description: `At 50% progress: The serializer clock pushes bits into the transceiver buffer. Link A ($d_{trans} = ${fmtMs(txA_ms)}$) vs Link B ($d_{trans} = ${fmtMs(txB_ms)}$).`,
      codeLines: [4],
    },
    {
      tracks: [trackA, trackB],
      clockMs: Math.max(txA_ms, txB_ms),
      description: `Transmission complete! All bits have left the transmitter's interface. Formula: $d_{trans} = L / R$. A $10\\times$ bandwidth increase decreases serialization delay by exactly $10\\times$.`,
      codeLines: [5],
      message: { text: `Transmission Delay: A = ${fmtMs(txA_ms)}, B = ${fmtMs(txB_ms)}`, tone: "ok" },
    },
  ];

  return {
    steps,
    title: `Transmission Delay (L / R) — ${fmtSize(p.fileKB)}`,
    pseudocode: TRANS_CODE,
    stats: [
      { label: "Packet L", value: fmtSize(p.fileKB), tone: "signal" },
      { label: `d_trans (${p.a.label})`, value: fmtMs(txA_ms), tone: "mint" },
      { label: `d_trans (${p.b.label})`, value: fmtMs(txB_ms), tone: "amber" },
      { label: "Formula", value: "L / R", tone: "signal" },
    ],
  };
}

// --- operation: Propagation Delay (d / s) -----------------------------------

const PROP_CODE = [
  "Propagation Delay d_prop = d / s",
  "  d = physical distance of link in meters",
  "  s = wave propagation speed in medium (~2e8 m/s in fiber/copper)",
  "Physical wave travels through matter at speed of light in medium",
  "d_prop depends ONLY on distance and medium (NOT bandwidth or packet size)",
];

function propagationDelay(p: SignalRunParams): SignalProgram {
  const distA_km = p.a.propagationMs * 200; // 200 km per ms in fiber (2e8 m/s)
  const distB_km = p.b.propagationMs * 200;
  const propA = p.a.propagationMs;
  const propB = p.b.propagationMs;

  const trackA: SignalTrack = {
    id: "prop-a",
    label: `${p.a.label} (${distA_km.toFixed(0)} km)`,
    sub: `d = ${distA_km.toFixed(0)} km · s = 200,000 km/s · d_prop = ${fmtMs(propA)}`,
    bandwidthMbps: 100,
    propagationMs: propA,
    frontT: 1.0,
    tailT: 0.9,
    sentBits: 12000,
    totalBits: 12000,
    deliveredBits: 12000,
    elapsedMs: propA,
    finishedMs: propA,
    tone: "signal",
  };

  const trackB: SignalTrack = {
    id: "prop-b",
    label: `${p.b.label} (${distB_km.toFixed(0)} km)`,
    sub: `d = ${distB_km.toFixed(0)} km · s = 200,000 km/s · d_prop = ${fmtMs(propB)}`,
    bandwidthMbps: 100,
    propagationMs: propB,
    frontT: 1.0,
    tailT: 0.9,
    sentBits: 12000,
    totalBits: 12000,
    deliveredBits: 12000,
    elapsedMs: propB,
    finishedMs: propB,
    tone: "violet",
  };

  const steps: SignalStep[] = [
    {
      tracks: [
        { ...trackA, frontT: 0, tailT: 0, deliveredBits: 0, elapsedMs: 0 },
        { ...trackB, frontT: 0, tailT: 0, deliveredBits: 0, elapsedMs: 0 },
      ],
      clockMs: 0,
      description: `Propagation Delay is the time required for a physical electromagnetic pulse (light photon or electrical voltage wave) to cross distance $d$ through physical medium at velocity $s$.`,
      codeLines: [1, 2, 3],
    },
    {
      tracks: [
        { ...trackA, frontT: 0.6, tailT: 0.5, deliveredBits: 0, elapsedMs: propA * 0.6 },
        { ...trackB, frontT: 0.6, tailT: 0.5, deliveredBits: 0, elapsedMs: propB * 0.6 },
      ],
      clockMs: Math.min(propA, propB) * 0.6,
      description: `Wavefront propagating along the medium at the speed of light in glass/copper ($s \\approx 2 \\times 10^8\\text{ m/s}$). No bandwidth upgrade can make light travel faster!`,
      codeLines: [4],
    },
    {
      tracks: [trackA, trackB],
      clockMs: Math.max(propA, propB),
      description: `Wavefront hits the receiver! Formula: $d_{prop} = d / s$. Link A: ${fmtMs(propA)}, Link B: ${fmtMs(propB)}. Propagation delay is governed purely by Einstein's speed of light and geometry.`,
      codeLines: [5],
      message: { text: `Propagation flight time: A=${fmtMs(propA)}, B=${fmtMs(propB)}`, tone: "ok" },
    },
  ];

  return {
    steps,
    title: "Propagation Delay (d / s) — Speed of Light in Medium",
    pseudocode: PROP_CODE,
    stats: [
      { label: "Wave Velocity s", value: "200,000 km/s", tone: "signal" },
      { label: `Distance (${p.a.label})`, value: `${distA_km.toFixed(0)} km`, tone: "mint" },
      { label: `Distance (${p.b.label})`, value: `${distB_km.toFixed(0)} km`, tone: "amber" },
      { label: "Formula", value: "d / s", tone: "signal" },
    ],
  };
}

// --- operation: Queuing & Processing Delay ----------------------------------

const QUEUE_CODE = [
  "1. Packet arrives at Router Ingress Port",
  "2. Processing Delay d_proc: check bit errors (CRC), IP header lookup",
  "3. Queuing Delay d_queue: wait in FIFO buffer for link to free",
  "4. If queue full (Traffic Intensity I = L*lambda/R >= 1): TAIL DROP PACKET",
  "5. Output interface serializes packet when line is idle",
];

function queuingProcessing(p: SignalRunParams): SignalProgram {
  void p;
  const steps: SignalStep[] = [];
  const track: SignalTrack = {
    id: "queue-track",
    label: "Router Output Interface Queue",
    sub: "Buffer Capacity: 10 Packets · Arrival Rate: lambda",
    bandwidthMbps: 100,
    propagationMs: 2,
    frontT: 0,
    tailT: 0,
    sentBits: 1500 * 8,
    totalBits: 1500 * 8 * 4,
    deliveredBits: 0,
    elapsedMs: 0,
    tone: "amber",
  };

  steps.push({
    tracks: [track],
    clockMs: 0,
    description: "Router Ingress: A packet arrives at the router. Processing delay ($d_{proc} \\approx 10-50\\ \\mu\\text{s}$) begins immediately as the CPU checks the IP header checksum and queries the forwarding table.",
    codeLines: [1, 2],
  });

  steps.push({
    tracks: [{ ...track, elapsedMs: 1.5, frontT: 0.3 }],
    clockMs: 1.5,
    description: "FIFO Queuing: The packet enters the output interface queue. It must wait for earlier packets ahead in line to finish transmitting ($d_{queue}$). If arrival rate $\\lambda$ exceeds transmission rate $\\mu$, queue length grows exponentially.",
    codeLines: [3],
    message: { text: "Queuing delay active · Buffer 40% full", tone: "warn" },
  });

  steps.push({
    tracks: [{ ...track, elapsedMs: 3.2, frontT: 1.0, deliveredBits: 1500 * 8 }],
    clockMs: 3.2,
    description: "Queue drained: Line becomes free and the packet is serialized onto the outgoing wire. If traffic intensity $I = \\frac{L\\lambda}{R} \\ge 1$, buffers overflow and packets are discarded (Tail Drop Loss).",
    codeLines: [4, 5],
    message: { text: "Packet serialized · Zero packet drops", tone: "ok" },
  });

  return {
    steps,
    title: "Queuing & Processing Delay at Router Node",
    pseudocode: QUEUE_CODE,
    stats: [
      { label: "d_proc", value: "0.04 ms", tone: "mint" },
      { label: "d_queue (Avg)", value: "1.5 ms", tone: "amber" },
      { label: "Traffic Intensity I", value: "0.65 (< 1.0 OK)", tone: "mint" },
      { label: "Drop Policy", value: "FIFO Tail-Drop", tone: "signal" },
    ],
  };
}

export type SignalOp =
  | "bandwidthVsLatency"
  | "transmissionDelay"
  | "propagationDelay"
  | "queuingProcessing";

// --- timeline labels and Predict questions (ARCHITECTURE.md §9a) ------------

/** Wrong-but-plausible times: off by the factors students actually confuse. */
const timeOptions = (ms: number) => [ms * 10, ms / 10, ms * 2, ms / 2].map(fmtMs);

function annotateRace(prog: SignalProgram, p: SignalRunParams): SignalProgram {
  const [A, B] = derive(p);
  const fast = A.finishMs <= B.finishMs ? A : B;
  const slow = fast === A ? B : A;
  const steps = prog.steps;
  steps.forEach((st, i) => {
    const t = st.clockMs;
    if (i === 0) st.label = "ready";
    else if (i === steps.length - 1) st.label = "verdict";
    else if (t <= START_MS) st.label = "queue";
    else if (st.message?.tone === "ok") st.label = `${fast.label} ✓`;
    else if (!st.tracks.every((tr) => tr.sentBits >= tr.totalBits - 1e-6)) st.label = "push bits";
    else st.label = "in flight";
  });
  const firstTx = steps.findIndex((st) => st.label === "push bits");
  if (firstTx > 0)
    steps[firstTx].predict = ask(
      `${fmtSize(clamp(p.fileKB, MIN_KB, MAX_KB))} onto a ${A.bandwidthMbps} Mbps link. How long does ${A.label} take just to push the bits out?`,
      fmtMs(A.txMs),
      timeOptions(A.txMs),
      `Transmission delay = L / R = ${A.totalBits.toLocaleString()} bits ÷ ${A.bandwidthMbps} Mbps = ${fmtMs(A.txMs)}. Distance plays no part in it.`,
      Math.round(A.txMs),
    );
  const done = steps.findIndex((st) => st.label === `${fast.label} ✓`);
  if (done > 0)
    steps[done].predict = ask(
      `${A.label}: ${A.bandwidthMbps} Mbps, ${A.propagationMs} ms away. ${B.label}: ${B.bandwidthMbps} Mbps, ${B.propagationMs} ms away. Which delivers the whole file first?`,
      fast.label,
      [slow.label, "They tie"],
      `${fast.label} finishes at ${fmtMs(fast.finishMs)}, ${slow.label} at ${fmtMs(slow.finishMs)}. Total = queuing + processing + L/R + propagation — whichever term is biggest decides.`,
      fast === A ? 1 : 0,
    );
  return prog;
}

function annotate(op: SignalOp, prog: SignalProgram, p: SignalRunParams): SignalProgram {
  const s = prog.steps;
  switch (op) {
    case "transmissionDelay": {
      const bits = p.fileKB * 1024 * 8;
      const txB = (bits / (p.b.bandwidthMbps * 1e6)) * 1000;
      return { ...prog, steps: tag(s, ["L / R", "halfway", "all out"], {
        2: ask(
          `${fmtSize(p.fileKB)} is ${bits.toLocaleString()} bits. At ${p.b.bandwidthMbps} Mbps, what is ${p.b.label}'s transmission delay?`,
          fmtMs(txB),
          timeOptions(txB),
          `L / R = ${bits.toLocaleString()} ÷ ${(p.b.bandwidthMbps * 1e6).toLocaleString()} bits/s = ${fmtMs(txB)}.`,
          2,
        ),
      }) };
    }
    case "propagationDelay": {
      const km = p.b.propagationMs * 200;
      return { ...prog, steps: tag(s, ["d / s", "in flight", "arrives"], {
        2: ask(
          `${p.b.label} is ${km.toFixed(0)} km long. Signals move at about 200 000 km/s. How long does the first bit take to cross it?`,
          fmtMs(p.b.propagationMs),
          timeOptions(p.b.propagationMs),
          `d / s = ${km.toFixed(0)} km ÷ 200 000 km/s = ${fmtMs(p.b.propagationMs)}. Bandwidth has nothing to do with it.`,
          1,
        ),
      }) };
    }
    case "queuingProcessing":
      return { ...prog, steps: tag(s, ["process", "queue", "sent"], {
        2: ask(
          "Traffic intensity I = Lλ/R is 0.65. What happens to packets arriving at this router?",
          "They wait a little, but none are dropped",
          ["They are all dropped", "They skip the queue", "The link speeds up to match"],
          "Below I = 1 the link can, on average, keep up: the queue grows and shrinks but does not overflow. At I ≥ 1 it grows without bound and the tail is dropped.",
          0,
        ),
      }) };
    default:
      return annotateRace(prog, p);
  }
}

export function runSignalOperation(op: SignalOp, p: SignalRunParams): SignalProgram {
  switch (op) {
    case "transmissionDelay":
      return annotate(op, transmissionDelay(p), p);
    case "propagationDelay":
      return annotate(op, propagationDelay(p), p);
    case "queuingProcessing":
      return annotate(op, queuingProcessing(p), p);
    case "bandwidthVsLatency":
    default:
      return annotate("bandwidthVsLatency", bandwidthVsLatency(p), p);
  }
}

