// ---------------------------------------------------------------------------
// signalFacts — Inspector cards for the pipes canvas: a clicked pipe (its
// bandwidth, length and the four delays worked out for this file) and a
// clicked slice of the delay chart (which formula, which number).
// ---------------------------------------------------------------------------

import type { FactSpec } from "./lessonKit.ts";
import type { DelayKind, SignalTrack } from "../types/visualization.ts";

const fmt = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : ms >= 10 ? `${ms.toFixed(1)} ms` : `${ms.toFixed(2)} ms`);

export const DELAY_FACTS: Record<DelayKind, { name: string; formula: string; lead: string; setBy: string; remember: string }> = {
  transmission: {
    name: "Transmission delay",
    formula: "L / R",
    lead: "The time to push every bit of the packet onto the wire, one after another.",
    setBy: "packet size and bandwidth",
    remember: "Double the bandwidth, halve the transmission delay. Distance does not appear.",
  },
  propagation: {
    name: "Propagation delay",
    formula: "d / s",
    lead: "The time one bit takes to physically travel the length of the link.",
    setBy: "distance and the medium's signal speed (~2×10⁸ m/s)",
    remember: "No bandwidth upgrade makes light go faster. Only a shorter path helps.",
  },
  queuing: {
    name: "Queuing delay",
    formula: "depends on load",
    lead: "Time spent waiting in a router's output buffer behind packets that got there first.",
    setBy: "how busy the link is (traffic intensity Lλ/R)",
    remember: "The only delay that changes from packet to packet — and the one that causes drops.",
  },
  processing: {
    name: "Processing delay",
    formula: "fixed per router",
    lead: "Time for the router to check the header and look up where the packet goes.",
    setBy: "the router's hardware",
    remember: "Microseconds on modern routers — usually the smallest of the four.",
  },
};

export function delayFact(kind: DelayKind, ms: number, link: string, totalMs: number): FactSpec {
  const f = DELAY_FACTS[kind];
  return {
    lead: f.lead,
    rows: [
      ["Link", link],
      ["Formula", f.formula],
      ["This run", fmt(ms)],
      ["Share of total", `${((ms / totalMs) * 100).toFixed(ms / totalMs < 0.01 ? 2 : 0)}%`],
      ["Set by", f.setBy],
    ],
    remember: f.remember,
  };
}

export function pipeFact(t: SignalTrack): FactSpec {
  const txMs = (t.totalBits / (t.bandwidthMbps * 1000));
  const km = t.propagationMs * 200;
  const inFlight = t.bandwidthMbps * 1000 * t.propagationMs;
  return {
    lead: "A link drawn as a pipe: its thickness is bandwidth (how many bits per second fit in), its length is propagation delay (how long each bit takes to cross).",
    rows: [
      ["Bandwidth", `${t.bandwidthMbps} Mbps`],
      ["One-way flight time", fmt(t.propagationMs)],
      ["≈ distance in fibre", `${km >= 10 ? km.toFixed(0) : km.toFixed(1)} km`],
      ["Transmission (L/R)", fmt(txMs)],
      ["Bits in the pipe at once", Math.round(inFlight).toLocaleString()],
      ["Clock now", fmt(t.elapsedMs)],
    ],
    more: "Bandwidth × delay is how many bits fit inside the pipe at once. A long fat pipe holds a lot of data that has been sent but not yet received.",
    remember: "Total delay = queuing + processing + transmission + propagation.",
  };
}
