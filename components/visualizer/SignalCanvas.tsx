"use client";

// Links drawn as pipes, with the delay breakdown stacked underneath.
//
// The two bar charts share one linear scale on purpose. When the file is small
// the fibre bar is a sliver next to the satellite's — that sliver IS the
// lesson. Switch to 100 MB and the two bars become almost the same length,
// which is the same lesson read backwards. Cyan is the share of time bandwidth
// controls, violet the share distance controls; watching which one dominates
// is the whole topic.

import { AnimatePresence, motion } from "framer-motion";
import { FitStage } from "@/components/visualizer/FitStage";
import { fmtBits, fmtMs } from "@/engines/signalEngine";
import { useSignalStore } from "@/lib/signalStore";
import type { DelayKind, DelaySeg, SignalTrack } from "@/types/visualization";

const PIPE_W = 430;
const TRACK_W = 640;

const DELAY_COLOR: Record<DelayKind, string> = {
  queuing: "#F5A623",
  processing: "#34C98A",
  transmission: "#22D3EE",
  propagation: "#A78BFA",
};

const DELAY_LABEL: Record<DelayKind, string> = {
  queuing: "queuing",
  processing: "processing",
  transmission: "transmission — set by BANDWIDTH",
  propagation: "propagation — set by DISTANCE",
};

const TONE_HEX: Record<SignalTrack["tone"], string> = {
  signal: "#22D3EE",
  amber: "#F5A623",
  mint: "#34C98A",
  violet: "#A78BFA",
  coral: "#FF5F4A",
};

export function SignalCanvas() {
  const step = useSignalStore((s) => s.currentStep());
  if (!step) return null;

  return (
    <FitStage>
      <div className="flex flex-col items-center gap-4" style={{ width: TRACK_W }}>
        {/* Shared virtual clock */}
        <div className="flex items-baseline gap-2 rounded-full border border-outline-variant bg-surface-container-low/70 px-4 py-1">
          <span className="font-label-caps text-[9px] tracking-widest text-on-surface-variant/50">CLOCK</span>
          <span className="font-mono text-[15px] font-bold text-primary">{fmtMs(step.clockMs)}</span>
        </div>

        {/* The pipes */}
        <div className="flex w-full flex-col gap-3">
          {step.tracks.map((t) => (
            <Pipe key={t.id} t={t} />
          ))}
        </div>

        {/* Delay breakdown */}
        {step.chart && (
          <div className="w-full rounded-lg border border-outline-variant bg-surface-container-low/60 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant/70">
                {step.chart.title}
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                {(Object.keys(DELAY_COLOR) as DelayKind[]).map((k) => (
                  <span key={k} className="flex items-center gap-1 font-mono text-[9px] text-on-surface-variant/60">
                    <span className="h-2 w-2 rounded-[2px]" style={{ background: DELAY_COLOR[k] }} />
                    {k}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {step.chart.rows.map((r) => (
                <div key={r.label} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-right font-mono text-[11px] text-on-surface-variant/70">
                    {r.label}
                  </span>
                  <div className="relative h-5 flex-1 overflow-hidden rounded-sm bg-surface-container-lowest">
                    <div className="flex h-full">
                      {r.segs.map((sg, i) => (
                        <motion.div
                          key={i}
                          initial={false}
                          animate={{ width: `${Math.max((sg.ms / step.chart!.maxMs) * 100, 0.4)}%` }}
                          transition={{ type: "tween", duration: 0.4 }}
                          title={`${DELAY_LABEL[sg.kind]}: ${fmtMs(sg.ms)}`}
                          style={{ background: DELAY_COLOR[sg.kind] }}
                          className="h-full"
                        />
                      ))}
                    </div>
                  </div>
                  <span className="w-20 shrink-0 font-mono text-[11px] font-bold text-on-surface">
                    {fmtMs(r.totalMs)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step.message && (
            <motion.div
              key={step.message.text}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`rounded-full border px-4 py-1.5 font-label-caps text-[11px] tracking-wider ${
                step.message.tone === "error"
                  ? "border-coral/60 bg-coral/10 text-coral"
                  : step.message.tone === "ok"
                    ? "border-mint/60 bg-mint/10 text-mint"
                    : "border-amber/60 bg-amber/10 text-amber"
              }`}
            >
              {step.message.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FitStage>
  );
}

function Pipe({ t }: { t: SignalTrack }) {
  const hex = TONE_HEX[t.tone];
  // Pipe thickness IS bandwidth. Both links here are 100 Mbps, so they match —
  // which is the point: the only thing that differs is how long the pipe is.
  const pipeH = 16 + Math.min(1, t.bandwidthMbps / 200) * 26;
  const sentPct = (t.sentBits / t.totalBits) * 100;
  const gotPct = (t.deliveredBits / t.totalBits) * 100;
  const left = Math.min(t.tailT, t.frontT) * 100;
  const width = Math.max(0, (t.frontT - t.tailT) * 100);
  const done = t.finishedMs !== undefined;

  return (
    <div className="w-full rounded-lg border border-outline-variant bg-surface-container-low/40 p-2.5">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="flex items-baseline gap-2">
          <span className="font-label-caps text-label-caps" style={{ color: hex }}>
            {t.label}
          </span>
          <span className="font-body-sm text-[10px] text-on-surface-variant/55">{t.sub}</span>
        </span>
        <span
          className={`font-mono text-[11px] font-bold ${done ? "text-mint" : "text-on-surface-variant/70"}`}
        >
          {done ? `done · ${fmtMs(t.finishedMs!)}` : fmtMs(t.elapsedMs)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Meter label="TX" pct={sentPct} hex={hex} />

        <div
          className="relative flex-1 overflow-hidden rounded-md border"
          style={{ height: pipeH, width: PIPE_W, borderColor: `${hex}55`, background: "#0e0e0e" }}
        >
          {/* The bit stream, between its trailing and leading edge. */}
          <motion.div
            initial={false}
            animate={{ left: `${left}%`, width: `${width}%` }}
            transition={{ type: "tween", duration: 0.45, ease: "linear" }}
            className="absolute inset-y-0"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, ${hex} 0 3px, ${hex}44 3px 7px)`,
              boxShadow: `0 0 12px ${hex}66`,
            }}
          />
          {done && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-mint/20 px-2 py-0.5 font-label-caps text-[9px] text-mint">
                ALL BITS ARRIVED
              </span>
            </div>
          )}
        </div>

        <Meter label="RX" pct={gotPct} hex="#34C98A" />
      </div>

      <div className="mt-1 flex justify-between font-mono text-[9.5px] text-on-surface-variant/45">
        <span>sent {fmtBits(t.sentBits)}</span>
        <span>{t.bandwidthMbps} Mbps · {t.propagationMs} ms of flight time</span>
        <span>received {fmtBits(t.deliveredBits)}</span>
      </div>
    </div>
  );
}

function Meter({ label, pct, hex }: { label: string; pct: number; hex: string }) {
  return (
    <div className="flex w-8 shrink-0 flex-col items-center gap-0.5">
      <div className="relative h-8 w-4 overflow-hidden rounded-sm border border-outline-variant bg-surface-container-lowest">
        <motion.div
          initial={false}
          animate={{ height: `${pct}%` }}
          transition={{ type: "tween", duration: 0.4 }}
          className="absolute bottom-0 left-0 w-full"
          style={{ background: hex }}
        />
      </div>
      <span className="font-label-caps text-[8px] text-on-surface-variant/50">{label}</span>
    </div>
  );
}
