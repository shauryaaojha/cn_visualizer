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

export type SignalOp = "bandwidthVsLatency";

export function runSignalOperation(op: SignalOp, p: SignalRunParams): SignalProgram {
  void op;
  return bandwidthVsLatency(p);
}
