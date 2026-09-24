"use client";

// One shared channel over time: a row per station, time left to right,
// every transmission a bar. Overlapping data bars are collisions (pink).
// Token Ring adds the ring itself, with the token on its current holder.

import { AnimatePresence, motion } from "framer-motion";
import { FitStage } from "@/components/visualizer/FitStage";
import { factSelection } from "@/components/visualizer/lesson/FactBody";
import { useLessonUi } from "@/lib/lessonUiStore";
import { useMacStore } from "@/lib/macStore";
import { PALETTE } from "@/lib/palette";
import type { MacStep, MacTx } from "@/types/visualization";

const W = 820;
const LABEL_W = 130;
const ROW = 54;

const KIND: Record<MacTx["kind"], { color: string; name: string; about: string }> = {
  data: { color: PALETTE.data, name: "Data frame", about: "The station's actual frame on the channel." },
  jam: { color: PALETTE.fail, name: "Jam signal", about: "A short burst sent after detecting a collision, so every station knows the frame is garbage." },
  rts: { color: PALETTE.protocol, name: "RTS", about: "Request To Send: a tiny frame asking the AP to reserve the medium." },
  cts: { color: PALETTE.protocol, name: "CTS", about: "Clear To Send: the AP's reply — heard by everyone near the AP, including hidden stations." },
  ack: { color: PALETTE.ok, name: "ACK", about: "Wi-Fi's only proof of delivery, since radios can't detect collisions." },
  token: { color: PALETTE.control, name: "Token", about: "The permission to transmit, passed from station to station." },
  backoff: { color: PALETTE.muted, name: "Waiting", about: "A backoff or NAV period: the station deliberately stays silent." },
  difs: { color: PALETTE.note, name: "DIFS", about: "The idle period a Wi-Fi station must observe before contending." },
  sense: { color: PALETTE.note, name: "Carrier sense", about: "Listening to the channel before transmitting." },
};

const STATE_NAME: Record<string, string> = { idle: "idle", sensing: "listening", sending: "transmitting", backoff: "backing off", waiting: "waiting", done: "done", holding: "holding the token", collided: "collided" };

export function MacCanvas() {
  const step = useMacStore((s) => s.currentStep());
  const toggleSelect = useLessonUi((s) => s.toggleSelect);
  const selected = useLessonUi((s) => s.selection?.key);
  if (!step) return null;
  const chartW = W - LABEL_W;
  const x = (t: number) => LABEL_W + (t / step.tMax) * chartW;

  const txClick = (t: MacTx) => {
    const k = KIND[t.kind];
    toggleSelect(
      factSelection(`tx-${t.id}`, `Station ${t.station}`, t.label ? `${k.name} · ${t.label}` : k.name, t.state === "collided" ? PALETTE.fail : k.color, {
        lead: k.about,
        rows: [["From", `t = ${t.start}`], ["To", `t = ${t.end}`], ["Duration", `${t.end - t.start} units`], ["Outcome", t.state === "collided" ? "collided — lost" : t.state === "pending" ? "pending" : "ok"]],
        more: t.state === "collided" ? "Another data bar overlaps this one in time. On a shared channel that destroys both." : undefined,
      }),
    );
  };

  return (
    <FitStage>
      <div className="flex items-center gap-6">
        {step.ring && <Ring step={step} />}
        <div className="flex flex-col gap-3" style={{ width: W }}>
          <div className="flex items-center justify-between">
            <span className="font-hand text-[17px] font-bold text-primary">Channel over time</span>
            <span
              className={`rounded-full border px-3 py-0.5 font-mono text-[13px] font-bold ${
                step.channel === "collision" ? "border-coral text-coral" : step.channel === "busy" ? "border-primary text-primary" : "border-outline-variant text-on-surface-variant"
              }`}
            >
              channel: {step.channel}
            </span>
          </div>
          <svg width={W} height={step.stations.length * ROW + 30} className="overflow-visible">
            {step.slot &&
              Array.from({ length: Math.floor(step.tMax / step.slot) + 1 }).map((_, i) => (
                <line key={i} x1={x(i * step.slot!)} y1={0} x2={x(i * step.slot!)} y2={step.stations.length * ROW} stroke={PALETTE.note} strokeDasharray="3 5" opacity={0.4} />
              ))}
            {step.stations.map((s, r) => {
              const key = `st-${s.id}`;
              return (
                <g key={s.id}>
                  <g
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer outline-none"
                    onClick={() =>
                      toggleSelect(
                        factSelection(key, "Station", s.label, PALETTE.note, {
                          lead: `${s.label} is ${STATE_NAME[s.state]} right now.`,
                          rows: [["Frames sent", String(step.txs.filter((t) => t.station === s.id && t.kind === "data").length)], ["Collisions", String(step.txs.filter((t) => t.station === s.id && t.state === "collided").length)]],
                          remember: "On a shared medium every station hears every transmission.",
                        }),
                      )
                    }
                  >
                    <rect x={0} y={r * ROW + 8} width={LABEL_W - 12} height={ROW - 16} rx={6} fill={selected === key ? `${PALETTE.note}26` : "#2E604C"} stroke={s.state === "collided" ? PALETTE.fail : s.state === "holding" ? PALETTE.control : PALETTE.wire} strokeDasharray="4 3" />
                    <text x={10} y={r * ROW + 26} fill={PALETTE.chalk} fontSize={14} fontWeight={700} fontFamily="var(--font-kalam), cursive">
                      {s.label}
                    </text>
                    <text x={10} y={r * ROW + 41} fill={PALETTE.muted} fontSize={12} fontFamily="var(--font-jetbrains-mono), monospace">
                      {STATE_NAME[s.state]}
                    </text>
                  </g>
                  <line x1={LABEL_W} y1={r * ROW + ROW / 2} x2={W} y2={r * ROW + ROW / 2} stroke={PALETTE.wire} strokeDasharray="2 6" opacity={0.5} />
                </g>
              );
            })}
            {step.txs.map((t) => {
              const r = step.stations.findIndex((s) => s.id === t.station);
              if (r < 0) return null;
              const k = KIND[t.kind];
              const c = t.state === "collided" ? PALETTE.fail : k.color;
              const thin = t.kind === "backoff" || t.kind === "sense" || t.kind === "difs";
              const end = Math.min(t.end, step.now);
              const key = `tx-${t.id}`;
              return (
                <g key={t.id} role="button" tabIndex={0} className="cursor-pointer outline-none" onClick={() => txClick(t)}>
                  <motion.rect
                    x={x(t.start)}
                    y={r * ROW + (thin ? 22 : 12)}
                    height={thin ? 10 : ROW - 24}
                    rx={4}
                    fill={thin ? "transparent" : `${c}40`}
                    stroke={c}
                    strokeWidth={selected === key ? 3 : 2}
                    strokeDasharray={thin ? "4 3" : undefined}
                    initial={false}
                    animate={{ width: Math.max(4, x(end) - x(t.start)) }}
                    transition={{ duration: 0.4 }}
                  />
                  {t.label && x(end) - x(t.start) > 26 && (
                    <text x={x(t.start) + 5} y={r * ROW + (thin ? 20 : 32)} fill={c} fontSize={12} fontWeight={700} fontFamily="var(--font-jetbrains-mono), monospace">
                      {t.label}
                    </text>
                  )}
                </g>
              );
            })}
            <motion.line initial={false} animate={{ x1: x(step.now), x2: x(step.now) }} y1={0} y2={step.stations.length * ROW} stroke={PALETTE.data} strokeWidth={2} />
            {Array.from({ length: Math.floor(step.tMax / 5) + 1 }).map((_, i) => (
              <text key={i} x={x(i * 5)} y={step.stations.length * ROW + 20} textAnchor="middle" fill={PALETTE.muted} fontSize={12} fontFamily="var(--font-jetbrains-mono), monospace">
                {i * 5}
              </text>
            ))}
          </svg>
          <AnimatePresence mode="wait">
            {step.message && (
              <motion.div
                key={step.message.text}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`self-center rounded-full border-[1.5px] border-dashed px-4 py-1.5 font-hand text-[15px] font-bold ${
                  step.message.tone === "error" ? "border-coral/70 bg-coral/10 text-coral" : step.message.tone === "ok" ? "border-mint/70 bg-mint/10 text-mint" : step.message.tone === "warn" ? "border-amber/70 bg-amber/10 text-amber" : "border-outline-variant text-on-surface-variant"
                }`}
              >
                {step.message.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </FitStage>
  );
}

function Ring({ step }: { step: MacStep }) {
  const n = step.stations.length;
  const R = 100;
  const pos = (i: number) => ({ x: 130 + R * Math.cos((i / n) * 2 * Math.PI - Math.PI / 2), y: 130 + R * Math.sin((i / n) * 2 * Math.PI - Math.PI / 2) });
  const ti = step.stations.findIndex((s) => s.id === step.token);
  const tp = pos(Math.max(0, ti));
  return (
    <svg width={260} height={260}>
      <circle cx={130} cy={130} r={R} fill="none" stroke={PALETTE.wire} strokeWidth={2} strokeDasharray="6 5" />
      {step.stations.map((s, i) => {
        const p = pos(i);
        return (
          <g key={s.id}>
            <circle cx={p.x} cy={p.y} r={20} fill="#2E604C" stroke={s.state === "holding" ? PALETTE.control : PALETTE.chalk} strokeWidth={2} />
            <text x={p.x} y={p.y + 5} textAnchor="middle" fill={PALETTE.chalk} fontSize={15} fontWeight={700} fontFamily="var(--font-kalam), cursive">
              {s.id}
            </text>
          </g>
        );
      })}
      <motion.circle initial={false} animate={{ cx: tp.x, cy: tp.y - 30 }} r={9} fill={PALETTE.control} transition={{ type: "spring", stiffness: 160, damping: 18 }} />
      <text x={130} y={135} textAnchor="middle" fill={PALETTE.control} fontSize={13} fontFamily="var(--font-jetbrains-mono), monospace">
        token: {step.token}
      </text>
    </svg>
  );
}
