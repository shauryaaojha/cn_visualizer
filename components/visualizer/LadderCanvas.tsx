"use client";

// A message-sequence ("ladder") diagram: participants across the top, time
// running down, every message a slanted arrow whose slope is its flight
// time. Lost messages stop halfway with an ✕; timers are bars beside the
// sender's lifeline. Everything is clickable.

import { AnimatePresence, motion } from "framer-motion";
import { FitStage } from "@/components/visualizer/FitStage";
import { factSelection } from "@/components/visualizer/lesson/FactBody";
import { laneFact, msgFact, windowFact } from "@/engines/ladderFacts";
import { useLadderStore } from "@/lib/ladderStore";
import { useLessonUi } from "@/lib/lessonUiStore";
import { PALETTE } from "@/lib/palette";
import type { LadderMark, LadderMsg, LadderStep, WindowStrip } from "@/types/visualization";

const W = 900;
const HEAD = 64;
const KIND_COLOR: Record<LadderMsg["kind"], string> = {
  data: PALETTE.data,
  ack: PALETTE.ok,
  control: PALETTE.protocol,
  query: PALETTE.note,
  reply: PALETTE.control,
};
const MARK_COLOR: Record<LadderMark["kind"], string> = {
  timer: PALETTE.control,
  timeout: PALETTE.fail,
  deliver: PALETTE.ok,
  note: PALETTE.note,
  drop: PALETTE.fail,
  buffer: PALETTE.control,
};

export function LadderCanvas() {
  const step = useLadderStore((s) => s.currentStep());
  const toggleSelect = useLessonUi((s) => s.toggleSelect);
  const selected = useLessonUi((s) => s.selection?.key);
  if (!step) return null;

  const n = step.lanes.length;
  const gutter = n > 3 ? 90 : 140;
  const x = (id: string) => {
    const i = step.lanes.findIndex((l) => l.id === id);
    return gutter + (i * (W - gutter * 2)) / Math.max(1, n - 1);
  };
  const rowH = Math.max(16, Math.min(26, 560 / step.tMax));
  const y = (t: number) => HEAD + 14 + t * rowH;
  const H = y(step.tMax) + 10;

  return (
    <FitStage>
      <div className="flex flex-col items-center gap-3" style={{ width: W + (step.side ? 230 : 0) }}>
        {step.window && <WindowBar w={step.window} selected={selected === "win"} onClick={() => toggleSelect(factSelection("win", "Sliding window", step.window!.label, PALETTE.data, windowFact(step.window!)))} />}
        <div className="flex items-start gap-4">
          <svg width={W} height={H} className="overflow-visible">
            <defs>
              {Object.entries(KIND_COLOR).map(([k, c]) => (
                <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill={c} />
                </marker>
              ))}
            </defs>

            {/* lanes */}
            {step.lanes.map((l) => {
              const lx = x(l.id);
              const key = `lane-${l.id}`;
              return (
                <g
                  key={l.id}
                  role="button"
                  tabIndex={0}
                  aria-label={l.label}
                  className="cursor-pointer outline-none"
                  onClick={() => toggleSelect(factSelection(key, "Participant", l.label, PALETTE.note, laneFact(l, step.msgs)))}
                >
                  <line x1={lx} y1={HEAD} x2={lx} y2={H} stroke={PALETTE.wire} strokeWidth={1.5} strokeDasharray="4 6" opacity={0.7} />
                  <rect x={lx - 78} y={4} width={156} height={HEAD - 12} rx={8} fill={selected === key ? `${PALETTE.note}26` : "#2E604C"} stroke={selected === key ? PALETTE.note : PALETTE.wire} strokeWidth={1.5} strokeDasharray="5 3" />
                  <text x={lx} y={26} textAnchor="middle" fill={PALETTE.chalk} fontSize={16} fontWeight={700} fontFamily="var(--font-kalam), cursive">
                    {l.label}
                  </text>
                  {l.sub && (
                    <text x={lx} y={45} textAnchor="middle" fill={PALETTE.muted} fontSize={12} fontFamily="var(--font-jetbrains-mono), monospace">
                      {l.sub}
                    </text>
                  )}
                </g>
              );
            })}

            {/* time ticks */}
            {Array.from({ length: Math.floor(step.tMax / 5) + 1 }).map((_, i) => (
              <text key={i} x={6} y={y(i * 5) + 4} fill={PALETTE.muted} opacity={0.6} fontSize={12} fontFamily="var(--font-jetbrains-mono), monospace">
                {i * 5}
              </text>
            ))}

            {/* marks */}
            {step.marks.map((m, i) => (
              <Mark key={i} m={m} x={x(m.lane)} y={y} left={x(m.lane) > W / 2} />
            ))}

            {/* messages */}
            {step.msgs.map((m) => (
              <Message
                key={m.id}
                m={m}
                x0={x(m.from)}
                x1={x(m.to)}
                y0={y(m.t0)}
                y1={y(m.t1)}
                selected={selected === `msg-${m.id}`}
                onClick={() => toggleSelect(factSelection(`msg-${m.id}`, m.state === "lost" ? "Message · lost" : "Message", m.label, m.state === "lost" ? PALETTE.fail : KIND_COLOR[m.kind], msgFact(m)))}
              />
            ))}
          </svg>
          {step.side && <SidePanel side={step.side} />}
        </div>

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
                    : step.message.tone === "warn"
                      ? "border-amber/70 bg-amber/10 text-amber"
                      : "border-outline-variant bg-surface-container/80 text-on-surface-variant"
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

function Message({ m, x0, x1, y0, y1, selected, onClick }: { m: LadderMsg; x0: number; x1: number; y0: number; y1: number; selected: boolean; onClick: () => void }) {
  const lost = m.state === "lost";
  const color = lost ? PALETTE.fail : KIND_COLOR[m.kind];
  const ex = lost ? x0 + (x1 - x0) * 0.55 : x1 - Math.sign(x1 - x0) * 3;
  const ey = lost ? y0 + (y1 - y0) * 0.55 : y1;
  // Labels sit a third of the way along, so arrows crossing in opposite
  // directions keep their labels apart.
  const k = lost ? 0.5 : 0.32;
  const mx = x0 + (ex - x0) * k;
  const my = y0 + (ey - y0) * k;
  const w = Math.max(40, m.label.length * 7.6 + 14);
  const dashed = m.channel === "data";
  return (
    <g role="button" tabIndex={0} aria-label={m.label} className="cursor-pointer outline-none" onClick={onClick} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}>
      <line x1={x0} y1={y0} x2={ex} y2={ey} stroke="transparent" strokeWidth={14} />
      {selected && <line x1={x0} y1={y0} x2={ex} y2={ey} stroke={PALETTE.note} strokeWidth={8} opacity={0.35} strokeLinecap="round" />}
      <motion.line
        x1={x0}
        y1={y0}
        x2={ex}
        y2={ey}
        stroke={color}
        strokeWidth={m.fresh ? 3 : 2}
        strokeDasharray={dashed ? "8 4" : undefined}
        markerEnd={lost ? undefined : `url(#arrow-${m.kind})`}
        initial={m.fresh ? { pathLength: 0, opacity: 0.4 } : false}
        animate={{ pathLength: 1, opacity: m.fresh ? 1 : 0.75 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      {lost && (
        <motion.text x={ex} y={ey + 6} textAnchor="middle" fill={PALETTE.fail} fontSize={20} fontWeight={700} initial={m.fresh ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          ✕
        </motion.text>
      )}
      <motion.g initial={m.fresh ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ delay: m.fresh ? 0.35 : 0 }}>
        <rect x={mx - w / 2} y={my - 11} width={w} height={20} rx={5} fill={PALETTE.boardDeep} stroke={color} strokeOpacity={m.fresh ? 0.9 : 0.4} />
        <text x={mx} y={my + 4} textAnchor="middle" fill={color} fontSize={12.5} fontWeight={700} fontFamily="var(--font-jetbrains-mono), monospace">
          {m.label}
        </text>
      </motion.g>
    </g>
  );
}

function Mark({ m, x, y, left }: { m: LadderMark; x: number; y: (t: number) => number; left: boolean }) {
  const color = MARK_COLOR[m.kind];
  const side = left ? 1 : -1;
  const tx = x + side * 14;
  if (m.kind === "timer" && m.t1 !== undefined) {
    return (
      <g opacity={0.8}>
        <line x1={x - side * 8} y1={y(m.t)} x2={x - side * 8} y2={y(m.t1)} stroke={color} strokeWidth={3} strokeDasharray="2 4" strokeLinecap="round" />
        <text x={x - side * 14} y={y(m.t) + 12} textAnchor={left ? "end" : "start"} fill={color} fontSize={12} fontFamily="var(--font-jetbrains-mono), monospace">
          {m.label}
        </text>
      </g>
    );
  }
  return (
    <motion.g initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
      <circle cx={x} cy={y(m.t)} r={5} fill={color} />
      <text x={tx} y={y(m.t) + 4} textAnchor={left ? "start" : "end"} fill={color} fontSize={12} fontWeight={700} fontFamily="var(--font-jetbrains-mono), monospace">
        {m.kind === "timeout" ? "⏰ " : ""}
        {m.label}
      </text>
    </motion.g>
  );
}

function WindowBar({ w, selected, onClick }: { w: WindowStrip; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg border-[1.5px] border-dashed px-3 py-2 transition-colors hover:bg-surface-container-low ${selected ? "border-note" : "border-outline-variant"}`}
    >
      <span className="font-hand text-[15px] font-bold text-primary">{w.label}</span>
      <div className="relative flex gap-1">
        {Array.from({ length: w.total }).map((_, i) => {
          const acked = i < w.acked;
          const inWin = i >= w.base && i < w.base + w.size;
          const sent = i < w.next;
          return (
            <span
              key={i}
              className={`flex h-8 w-9 items-center justify-center rounded border font-mono text-[13px] font-bold ${
                acked ? "border-mint/60 bg-mint/20 text-mint" : inWin && sent ? "border-primary bg-primary/25 text-primary" : inWin ? "border-primary/60 text-primary/80" : "border-outline-variant/50 text-on-surface-variant/50"
              }`}
            >
              F{i}
            </span>
          );
        })}
        <motion.span
          className="pointer-events-none absolute -inset-y-1 rounded-md border-2 border-primary"
          initial={false}
          animate={{ left: w.base * 40 - 3, width: Math.min(w.size, w.total - w.base) * 40 + 2 }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
        />
      </div>
      <span className="font-mono text-[12px] text-on-surface-variant">acked · in flight · may send</span>
    </button>
  );
}

function SidePanel({ side }: { side: NonNullable<LadderStep["side"]> }) {
  return (
    <div className="mt-2 w-[214px] rounded-lg border-[1.5px] border-dashed border-outline-variant bg-surface-container-low/60 p-3">
      <p className="mb-2 font-hand text-[16px] font-bold text-primary">{side.title}</p>
      <dl className="flex flex-col gap-1.5">
        {side.rows.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <dt className="font-sans text-[12px] text-on-surface-variant">{k}</dt>
            <motion.dd key={v} initial={{ opacity: 0.2 }} animate={{ opacity: 1 }} className="font-mono text-[13px] font-bold text-on-surface">
              {v}
            </motion.dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
