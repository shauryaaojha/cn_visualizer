// ---------------------------------------------------------------------------
// signalEngine — links drawn as pipes.
//
// The metaphor the whole unit hangs on: a pipe's THICKNESS is bandwidth and its
// LENGTH is propagation delay. Pour the same file into two pipes of identical
// thickness but very different length and the answer to "why is my fast
// connection slow?" is visible without a word of explanation.
//
// The numbers are real. Nothing here is a hand-wave: transmission delay is
// bits ÷ bandwidth, propagation is a fixed flight time, and the totals are
// what you would actually measure.
// ---------------------------------------------------------------------------

import type { DelaySeg, SignalProgram, SignalStep, SignalTrack } from "@/types/visualization";

/** Fixed router cost applied to both paths, so all four delay types appear. */
const QUEUE_MS = 1.2;
const PROC_MS = 0.4;
const START_MS = QUEUE_MS + PROC_MS;

interface TrackSpec {
  id: string;
  label: string;
  medium: string;
  bandwidthMbps: number;
  propagationMs: number;
  tone: SignalTrack["tone"];
}

const TRACKS: TrackSpec[] = [
  {
    id: "fibre",
    label: "Fibre",
    medium: "ground fibre, ~400 km",
    bandwidthMbps: 100,
    propagationMs: 2,
    tone: "signal",
  },
  {
    id: "sat",
    label: "Satellite",
    medium: "geostationary, 2 × 36 000 km",
    bandwidthMbps: 100,
    propagationMs: 300,
    tone: "amber",
  },
];

export const FILE_PRESETS = [
  { kb: 10, label: "10 KB", what: "a web page" },
  { kb: 1024, label: "1 MB", what: "a photo" },
  { kb: 102400, label: "100 MB", what: "a video" },
];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function fmtMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  if (ms >= 10) return `${ms.toFixed(1)} ms`;
  return `${ms.toFixed(2)} ms`;
}

function fmtBits(bits: number): string {
  if (bits >= 8e6) return `${(bits / 8 / 1024 / 1024).toFixed(1)} MB`;
  if (bits >= 8192) return `${(bits / 8 / 1024).toFixed(1)} KB`;
  return `${Math.round(bits / 8)} B`;
}

const CODE = [
  "total_delay = queuing + processing + transmission + propagation",
  "",
  "transmission = file_size / bandwidth   -- time to PUSH the bits out",
  "propagation  = distance  / speed       -- time for bits to TRAVEL",
  "",
  "given: BOTH links run at 100 Mbps",
  "       fibre      propagation =   2 ms",
  "       satellite  propagation = 300 ms",
  "",
  "send the same file down both pipes",
  "compare total_delay",
];

interface Derived extends TrackSpec {
  totalBits: number;
  bpms: number;
  txMs: number;
  finishMs: number;
}

function derive(fileKB: number): Derived[] {
  const totalBits = fileKB * 1024 * 8;
  return TRACKS.map((t) => {
    const bpms = t.bandwidthMbps * 1000; // Mbps → bits per millisecond
    const txMs = totalBits / bpms;
    return { ...t, totalBits, bpms, txMs, finishMs: START_MS + txMs + t.propagationMs };
  });
}

function sample(d: Derived, t: number): SignalTrack {
  const since = t - START_MS;
  const sentBits = clamp01(since / d.txMs) * d.totalBits;
  const deliveredBits = clamp01((since - d.propagationMs) / d.txMs) * d.totalBits;
  return {
    id: d.id,
    label: d.label,
    sub: `${d.medium} · ${d.bandwidthMbps} Mbps · ${d.propagationMs} ms one-way`,
    bandwidthMbps: d.bandwidthMbps,
    propagationMs: d.propagationMs,
    frontT: clamp01(since / d.propagationMs),
    tailT: clamp01((since - d.txMs) / d.propagationMs),
    sentBits,
    totalBits: d.totalBits,
    deliveredBits,
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

function bandwidthVsLatency(fileKB: number): SignalProgram {
  const ds = derive(fileKB);
  const [fibre, sat] = ds;
  const txMs = fibre.txMs; // identical — same bandwidth
  const maxFinish = Math.max(...ds.map((d) => d.finishMs));
  const preset = FILE_PRESETS.find((p) => p.kb === fileKB);
  const sizeLabel = preset ? `${preset.label} (${preset.what})` : `${fileKB} KB`;
  const ratio = sat.finishMs / fibre.finishMs;

  // Sample the virtual clock where something actually changes, rather than at
  // a fixed cadence — otherwise a 300 ms satellite hop drowns out a 0.8 ms
  // transmission phase entirely.
  const times = new Set<number>([
    0,
    START_MS * 0.6,
    START_MS,
    START_MS + txMs * 0.5,
    START_MS + txMs,
    fibre.finishMs,
  ]);
  for (let i = 1; i <= 4; i++) {
    times.add(fibre.finishMs + ((sat.finishMs - fibre.finishMs) * i) / 5);
  }
  times.add(sat.finishMs);
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
    description: `Two links, ${sizeLabel} to send down each. Both run at exactly 100 Mbps — identical bandwidth, so the pipes are equally THICK. The only difference is length: how far the bits have to physically travel.`,
    codeLines: [6, 7, 8],
  });

  for (const t of clocks) {
    if (t === 0) continue;
    let description: string;
    let codeLines: number[] = [1];

    if (t <= START_MS) {
      description = `${fmtMs(t)}. Nothing is moving yet. The packet is sitting in the router's queue and having its header examined — queuing and processing delay, the two components people forget.`;
      codeLines = [1];
    } else if (t < START_MS + txMs) {
      description = `${fmtMs(t)}. Transmission delay: the interface is clocking bits onto the wire at 100 Mbps. Both links fill at exactly the same rate, because this is the part bandwidth controls.`;
      codeLines = [3];
    } else if (Math.abs(t - (START_MS + txMs)) < 1e-9) {
      description = `${fmtMs(t)}. Last bit is on the wire after ${fmtMs(txMs)}. Bandwidth's job is now completely finished — everything from here is travel time, and no amount of extra bandwidth would help.`;
      codeLines = [3, 4];
    } else if (t < fibre.finishMs) {
      description = `${fmtMs(t)}. Propagation: the bits are in flight. The fibre's pipe is short so its leading edge is nearly there; the satellite's bits are climbing 36 000 km to orbit.`;
      codeLines = [4];
    } else if (t < sat.finishMs) {
      description = `${fmtMs(t)}. Fibre is done — the whole file has landed. The satellite link has transmitted every one of its bits too, and is now just waiting for them to arrive.`;
      codeLines = [4, 10];
    } else {
      description = `${fmtMs(t)}. Satellite finally completes. Same file, same bandwidth, ${ratio.toFixed(ratio >= 10 ? 0 : 2)}× the wait.`;
      codeLines = [10, 11];
    }

    steps.push({
      tracks: ds.map((d) => sample(d, t)),
      clockMs: t,
      chart,
      description,
      codeLines,
      message:
        Math.abs(t - fibre.finishMs) < 1e-9
          ? { text: `Fibre delivered in ${fmtMs(fibre.finishMs)}`, tone: "ok" }
          : undefined,
    });
  }

  // The payoff: the same two links, opposite conclusions, depending only on size.
  const bigFile = ratio < 1.5;
  steps.push({
    tracks: ds.map((d) => sample(d, maxFinish)),
    clockMs: maxFinish,
    chart,
    description: bigFile
      ? `At ${sizeLabel} the verdict flips. Transmission delay (${fmtMs(txMs)}) now dwarfs the 300 ms flight time, so satellite is only ${ratio.toFixed(2)}× slower — practically the same. Bandwidth dominates for big transfers; latency dominates for small ones. Switch the file size in the sidebar and watch the conclusion reverse.`
      : `${sizeLabel} takes ${fmtMs(fibre.finishMs)} on fibre and ${fmtMs(sat.finishMs)} on satellite — ${ratio.toFixed(ratio >= 10 ? 0 : 2)}× longer, with identical bandwidth. This is why a "fast" connection can feel slow: bandwidth sets how much you can push per second, latency sets how long the first byte takes to arrive, and clicking a link is dominated by latency. Try 100 MB in the sidebar — the verdict reverses.`,
    codeLines: [10, 11],
    message: {
      text: bigFile
        ? `Satellite only ${ratio.toFixed(2)}× slower — bandwidth wins at this size`
        : `Satellite ${ratio.toFixed(ratio >= 10 ? 0 : 2)}× slower at identical bandwidth`,
      tone: bigFile ? "ok" : "error",
    },
  });

  return {
    steps,
    title: `Bandwidth vs Latency — ${sizeLabel}`,
    pseudocode: CODE,
    stats: [
      { label: "File", value: preset?.label ?? `${fileKB} KB`, tone: "signal" },
      { label: "Transmission", value: fmtMs(txMs), tone: "signal" },
      { label: "Fibre total", value: fmtMs(fibre.finishMs), tone: "mint" },
      { label: "Satellite total", value: fmtMs(sat.finishMs), tone: "amber" },
      {
        label: "Satellite is",
        value: `${ratio.toFixed(ratio >= 10 ? 0 : 2)}× slower`,
        tone: ratio < 1.5 ? "mint" : "coral",
      },
    ],
  };
}

export type SignalOp = "bandwidthVsLatency";

export function runSignalOperation(op: SignalOp, params: { fileKB?: number } = {}): SignalProgram {
  void op;
  return bandwidthVsLatency(params.fileKB ?? 10);
}

export { fmtMs, fmtBits };
