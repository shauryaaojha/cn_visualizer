"use client";

// Links drawn as pipes, with the delay breakdown stacked underneath.
//
// The two bar charts share one linear scale on purpose. When the file is small
// the fibre bar is a sliver next to the satellite's — that sliver IS the
// lesson. Switch to 100 MB and the two bars become almost the same length,
// which is the same lesson read backwards. Chalk yellow is the share of time
// bandwidth controls, violet the share distance controls; watching which one
// dominates is the whole topic.

import { AnimatePresence, motion } from "framer-motion";
import { FitStage } from "@/components/visualizer/FitStage";
import { factSelection } from "@/components/visualizer/lesson/FactBody";
import { fmtBits, fmtMs } from "@/engines/signalEngine";
import { DELAY_FACTS, delayFact, pipeFact } from "@/engines/signalFacts";
import { useLessonUi } from "@/lib/lessonUiStore";
import { PALETTE } from "@/lib/palette";
import { useSignalStore } from "@/lib/signalStore";
import type { DelayKind, SignalTrack } from "@/types/visualization";

const PIPE_W = 430;
const TRACK_W = 640;

// The headline contrast is transmission (chalk yellow) against propagation
// (chalk violet) — literally bandwidth's share of the time against distance's.
const DELAY_COLOR: Record<DelayKind, string> = {
  queuing: PALETTE.control,
  processing: PALETTE.ok,
  transmission: PALETTE.data,
  propagation: PALETTE.protocol,
};

const DELAY_LABEL: Record<DelayKind, string> = {
  queuing: "queuing",
  processing: "processing",
  transmission: "transmission — set by BANDWIDTH",
  propagation: "propagation — set by DISTANCE",
};

const TONE_HEX: Record<SignalTrack["tone"], string> = {
  signal: PALETTE.data,
  amber: PALETTE.control,
  mint: PALETTE.ok,
  violet: PALETTE.protocol,
  coral: PALETTE.fail,
};

export function SignalCanvas() {
  const step = useSignalStore((s) => s.currentStep());
  const toggleSelect = useLessonUi((s) => s.toggleSelect);
  const selected = useLessonUi((s) => s.selection?.key);
  if (!step) return null;

  return (
    <FitStage>
      <div className="flex flex-col items-center gap-4" style={{ width: TRACK_W }}>
        {/* Shared virtual clock */}
        <div className="flex items-baseline gap-2 rounded-full border-[1.5px] border-dashed border-outline-variant bg-surface-container-low/70 px-4 py-1">
          <span className="font-label-caps text-[12px] uppercase tracking-widest text-on-surface-variant/70">Clock</span>
          <span className="font-mono text-[15px] font-bold text-primary">{fmtMs(step.clockMs)}</span>
        </div>

        {/* The pipes */}
        <div className="flex w-full flex-col gap-3">
          {step.tracks.map((t) => (
            <Pipe
              key={t.id}
              t={t}
              selected={selected === `pipe-${t.id}`}
              onClick={() => toggleSelect(factSelection(`pipe-${t.id}`, "Link", t.label, TONE_HEX[t.tone], pipeFact(t)))}
            />
          ))}
        </div>

        {/* Delay breakdown */}
        {step.chart && (
          <div className="w-full rounded-lg border-[1.5px] border-dashed border-outline-variant bg-surface-container-low/50 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-hand text-[15px] font-bold text-on-surface">
                {step.chart.title}
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                {(Object.keys(DELAY_COLOR) as DelayKind[]).map((k) => (
                  <span key={k} className="flex items-center gap-1 font-mono text-[12px] text-on-surface-variant/80">
                    <span className="h-2 w-2 rounded-[2px]" style={{ background: DELAY_COLOR[k] }} />
                    {k}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {step.chart.rows.map((r) => (
                <div key={r.label} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-right font-mono text-[12px] text-on-surface-variant/80">
                    {r.label}
                  </span>
                  <div className="relative h-5 flex-1 overflow-hidden rounded-sm border border-outline-variant/50 bg-black/25">
                    <div className="flex h-full">
                      {r.segs.map((sg, i) => {
                        const key = `delay-${r.label}-${sg.kind}`;
                        return (
                          <motion.button
                            type="button"
                            key={i}
                            initial={false}
                            animate={{ width: `${Math.max((sg.ms / step.chart!.maxMs) * 100, 0.8)}%` }}
                            transition={{ type: "tween", duration: 0.4 }}
                            title={`${DELAY_LABEL[sg.kind]}: ${fmtMs(sg.ms)}`}
                            aria-label={`${r.label} ${sg.kind} delay ${fmtMs(sg.ms)}`}
                            onClick={() =>
                              toggleSelect(
                                factSelection(key, `Delay · ${r.label}`, DELAY_FACTS[sg.kind].name, DELAY_COLOR[sg.kind], delayFact(sg.kind, sg.ms, r.label, r.totalMs)),
                              )
                            }
                            style={{ background: DELAY_COLOR[sg.kind] }}
                            className={`h-full cursor-pointer hover:brightness-125 ${selected === key ? "outline outline-2 -outline-offset-2 outline-surface" : ""}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <span className="w-20 shrink-0 font-mono text-[12px] font-bold text-on-surface">
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
              className={`rounded-full border-[1.5px] border-dashed px-4 py-1.5 font-hand text-[15px] font-bold ${
                step.message.tone === "error"
                  ? "border-coral/70 bg-coral/10 text-coral"
                  : step.message.tone === "ok"
                    ? "border-mint/70 bg-mint/10 text-mint"
                    : "border-amber/70 bg-amber/10 text-amber"
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

function Pipe({ t, selected, onClick }: { t: SignalTrack; selected: boolean; onClick: () => void }) {
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
    <button
      type="button"
      onClick={onClick}
      className={`w-full cursor-pointer rounded-lg border-[1.5px] border-dashed bg-surface-container-low/35 p-2.5 text-left transition-colors hover:bg-surface-container-low/60 ${
        selected ? "border-note" : "border-outline-variant"
      }`}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="flex items-baseline gap-2">
          <span className="font-hand text-[16px] font-bold" style={{ color: hex }}>
            {t.label}
          </span>
          <span className="font-mono text-[12px] text-on-surface-variant/75">{t.sub}</span>
        </span>
        <span
          className={`font-mono text-[12px] font-bold ${done ? "text-mint" : "text-on-surface-variant/70"}`}
        >
          {done ? `done · ${fmtMs(t.finishedMs!)}` : fmtMs(t.elapsedMs)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Meter label="TX" pct={sentPct} hex={hex} />

        <div
          className="relative flex-1 overflow-hidden rounded-md border"
          style={{ height: pipeH, width: PIPE_W, borderColor: `${hex}66`, background: "rgba(0,0,0,0.28)", borderStyle: "dashed", borderWidth: 1.5 }}
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
              <span className="rounded-full bg-mint/20 px-2 py-0.5 font-hand text-[12px] font-bold text-mint">
                all bits arrived
              </span>
            </div>
          )}
        </div>

        <Meter label="RX" pct={gotPct} hex={PALETTE.ok} />
      </div>

      <div className="mt-1 flex justify-between font-mono text-[12px] text-on-surface-variant/70">
        <span>sent {fmtBits(t.sentBits)}</span>
        <span>{t.bandwidthMbps} Mbps · {t.propagationMs} ms of flight time</span>
        <span>received {fmtBits(t.deliveredBits)}</span>
      </div>
    </button>
  );
}

function Meter({ label, pct, hex }: { label: string; pct: number; hex: string }) {
  return (
    <div className="flex w-8 shrink-0 flex-col items-center gap-0.5">
      <div className="relative h-8 w-4 overflow-hidden rounded-sm border border-outline-variant bg-black/30">
        <motion.div
          initial={false}
          animate={{ height: `${pct}%` }}
          transition={{ type: "tween", duration: 0.4 }}
          className="absolute bottom-0 left-0 w-full"
          style={{ background: hex }}
        />
      </div>
      <span className="font-label-caps text-[12px] uppercase text-on-surface-variant/70">{label}</span>
    </div>
  );
}
