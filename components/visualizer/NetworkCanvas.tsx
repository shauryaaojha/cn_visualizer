"use client";

// The animated network.
//
// A frame carries *panels*, so one component draws both a single topology and
// the five-up failure comparison — it just switches to a smaller node radius
// when there is more than one panel. Nodes keep stable ids and normalized
// (0–100) coordinates, so rewiring a topology makes them glide rather than
// snap. Packets ride links: position is a lerp along `linkId` at `t`, and
// framer-motion tweens between frames, which is why one frame per hop is
// enough to read as smooth movement.

import { AnimatePresence, motion } from "framer-motion";
import { FitStage } from "@/components/visualizer/FitStage";
import { useNetStore } from "@/lib/netStore";
import type { CellState, LinkState, NetPanel, Packet } from "@/types/visualization";

const NODE_STYLE: Record<CellState, string> = {
  idle: "border-outline-variant bg-surface-container/90 text-on-surface",
  active: "border-primary bg-primary/10 text-primary shadow-[0_0_18px_rgba(34,211,238,0.5)]",
  visited: "border-primary/45 bg-surface-container/90 text-primary/80",
  new: "border-mint bg-mint/10 text-mint",
  removing: "border-coral bg-coral/10 text-coral",
  target: "border-amber bg-amber/10 text-amber",
  found: "border-mint bg-mint/15 text-mint animate-ok-pulse",
  failed: "border-coral bg-coral/15 text-coral animate-fail-pulse",
};

const LINK_STYLE: Record<LinkState, { color: string; width: number; dash?: string; opacity: number; flow?: boolean }> =
  {
    idle: { color: "#44606a", width: 1.6, opacity: 0.75 },
    active: { color: "#22D3EE", width: 3, opacity: 1, flow: true },
    reserved: { color: "#22D3EE", width: 2.2, opacity: 0.55 },
    congested: { color: "#F5A623", width: 2.6, opacity: 1, dash: "6 3" },
    down: { color: "#FF5F4A", width: 2, opacity: 0.9, dash: "4 5" },
  };

const PACKET_STYLE: Record<Packet["state"], string> = {
  flying: "border-primary bg-primary text-surface shadow-[0_0_14px_rgba(34,211,238,0.7)]",
  queued: "border-amber bg-amber/20 text-amber",
  delivered: "border-mint bg-mint text-surface shadow-[0_0_14px_rgba(52,201,138,0.6)]",
  dropped: "border-coral bg-coral text-surface animate-fail-pulse",
};

const SPRING = { type: "spring", stiffness: 190, damping: 24 } as const;

export function NetworkCanvas() {
  const step = useNetStore((s) => s.currentStep());
  const panels = step?.panels ?? [];
  const multi = panels.length > 1;

  const W = multi ? 268 : 560;
  const H = multi ? 205 : 400;
  const R = multi ? 12 : 20;

  return (
    <FitStage>
      <div className="flex flex-col items-center gap-3">
        <div
          className={multi ? "grid grid-cols-3 gap-3" : "flex"}
          style={multi ? undefined : { width: W }}
        >
          {panels.map((p) => (
            <Panel key={p.id} panel={p} w={W} h={H} r={R} compact={multi} />
          ))}
        </div>

        {step?.strip && (
          <div className="flex items-center gap-2 self-center">
            <span className="shrink-0 font-label-caps text-[9px] uppercase tracking-wider text-on-surface-variant/60">
              {step.strip.label}
            </span>
            <div className="flex max-w-[560px] flex-wrap gap-1">
              {step.strip.chips.map((c, i) => (
                <span
                  key={i}
                  className="flex h-6 items-center justify-center border border-outline-variant/50 px-1.5 font-mono text-[11px] text-on-surface-variant/70"
                >
                  {c.text}
                </span>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step?.message && (
            <motion.div
              key={step.message.text}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`flex items-center self-center rounded-full border px-4 py-1.5 font-label-caps text-[11px] tracking-wider backdrop-blur-sm ${
                step.message.tone === "error"
                  ? "border-coral/60 bg-coral/10 text-coral"
                  : step.message.tone === "ok"
                    ? "border-mint/60 bg-mint/10 text-mint"
                    : step.message.tone === "warn"
                      ? "border-amber/60 bg-amber/10 text-amber"
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

function Panel({
  panel,
  w,
  h,
  r,
  compact,
}: {
  panel: NetPanel;
  w: number;
  h: number;
  r: number;
  compact: boolean;
}) {
  const pad = r + 8;
  const px = (x: number) => pad + (x / 100) * (w - pad * 2);
  const py = (y: number) => pad + (y / 100) * (h - pad * 2);
  const pos = new Map(panel.nodes.map((n) => [n.id, { x: px(n.x), y: py(n.y) }]));

  return (
    <motion.div
      animate={{ opacity: panel.dim ? 0.28 : 1 }}
      transition={{ duration: 0.35 }}
      className={`relative rounded-lg border bg-surface-container-low/50 backdrop-blur-sm ${
        panel.dim ? "border-outline-variant/40" : "border-outline-variant"
      }`}
      style={{ width: w, height: h + (compact ? 46 : 56) }}
    >
      {/* Panel header */}
      <div className="flex items-baseline justify-between gap-2 border-b border-outline-variant/50 px-2.5 py-1.5">
        <span
          className={`font-label-caps ${compact ? "text-[10px]" : "text-label-caps"} text-primary`}
        >
          {panel.label}
        </span>
        {panel.sub && (
          <span className="truncate font-body-sm text-[9.5px] text-on-surface-variant/55">{panel.sub}</span>
        )}
      </div>

      <div className="relative" style={{ width: w, height: h }}>
        <svg className="absolute inset-0 overflow-visible" width={w} height={h}>
          {panel.links.map((l) => {
            const a = pos.get(l.from);
            const b = pos.get(l.to);
            if (!a || !b) return null;
            const st = LINK_STYLE[l.state];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            // Trim the line back to each node's edge so it never pokes through.
            const rf = nodeRadius(panel, l.from, r);
            const rt = nodeRadius(panel, l.to, r);
            const x1 = a.x + (dx / len) * rf;
            const y1 = a.y + (dy / len) * rf;
            const x2 = b.x - (dx / len) * rt;
            const y2 = b.y - (dy / len) * rt;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            return (
              <g key={l.id}>
                <motion.line
                  initial={false}
                  animate={{ x1, y1, x2, y2, stroke: st.color, opacity: st.opacity }}
                  transition={{ type: "tween", duration: 0.4 }}
                  strokeWidth={st.width * (l.backbone ? 2 : 1)}
                  strokeDasharray={st.dash}
                  strokeLinecap="round"
                  className={st.flow ? "wire-flow" : undefined}
                />
                {/* A severed link gets an unmissable X at its midpoint. */}
                {l.state === "down" && (
                  <g>
                    <circle cx={mx} cy={my} r={r * 0.5} fill="#131313" opacity={0.9} />
                    <path
                      d={`M${mx - r * 0.28},${my - r * 0.28} L${mx + r * 0.28},${my + r * 0.28} M${mx + r * 0.28},${my - r * 0.28} L${mx - r * 0.28},${my + r * 0.28}`}
                      stroke="#FF5F4A"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                    />
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {panel.nodes.map((n) => {
          const p = pos.get(n.id)!;
          if (n.kind === "tap") {
            return (
              <div
                key={n.id}
                className="absolute rounded-full border border-outline-variant bg-surface-container"
                style={{ left: p.x - 4, top: p.y - 4, width: 8, height: 8 }}
              />
            );
          }
          const infra = n.kind === "switch" || n.kind === "router" || n.kind === "hub";
          return (
            <motion.div
              key={n.id}
              initial={false}
              animate={{ left: p.x - r, top: p.y - r }}
              transition={SPRING}
              className="absolute flex flex-col items-center"
              style={{ width: r * 2 }}
            >
              <div
                className={`relative flex items-center justify-center border-2 font-mono font-bold backdrop-blur-sm transition-all duration-300 ${
                  infra ? "rounded-md" : "rounded-full"
                } ${NODE_STYLE[n.state]}`}
                style={{
                  width: r * 2,
                  height: r * 2,
                  fontSize: compact ? 9 : 13,
                }}
              >
                {n.ring && (
                  <span className="pointer-events-none absolute -inset-[4px] rounded-full border border-dashed border-primary/60" />
                )}
                {n.label}
              </div>
              {n.badge && (
                <span className="mt-0.5 whitespace-nowrap rounded bg-surface-container/80 px-1 font-mono text-[9px] text-amber">
                  {n.badge}
                </span>
              )}
            </motion.div>
          );
        })}

        {/* Packets in flight */}
        {panel.packets.map((pk) => {
          const l = panel.links.find((x) => x.id === pk.linkId);
          if (!l) return null;
          const a = pos.get(l.from);
          const b = pos.get(l.to);
          if (!a || !b) return null;
          const x = a.x + (b.x - a.x) * pk.t;
          const y = a.y + (b.y - a.y) * pk.t;
          const pw = compact ? 22 : 32;
          const ph = compact ? 13 : 18;
          return (
            <motion.div
              key={pk.id}
              initial={false}
              animate={{ left: x - pw / 2, top: y - ph / 2 }}
              transition={{ type: "tween", duration: 0.55, ease: "easeInOut" }}
              className={`absolute z-10 flex items-center justify-center rounded-sm border font-mono font-bold ${PACKET_STYLE[pk.state]}`}
              style={{ width: pw, height: ph, fontSize: compact ? 8 : 10 }}
            >
              {pk.state === "dropped" ? "✕" : pk.label}
            </motion.div>
          );
        })}
      </div>

      {/* Per-panel verdict */}
      <div className="flex h-6 items-center justify-center px-2">
        <AnimatePresence mode="wait">
          {panel.verdict && (
            <motion.span
              key={panel.verdict.text}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`rounded-full border px-2 py-0.5 font-label-caps text-[9px] tracking-wider ${
                panel.verdict.tone === "error"
                  ? "border-coral/60 bg-coral/10 text-coral"
                  : panel.verdict.tone === "ok"
                    ? "border-mint/60 bg-mint/10 text-mint"
                    : "border-amber/60 bg-amber/10 text-amber"
              }`}
            >
              {panel.verdict.text}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/** Taps are drawn much smaller than hosts, so links must trim differently. */
function nodeRadius(panel: NetPanel, id: string, r: number): number {
  return panel.nodes.find((n) => n.id === id)?.kind === "tap" ? 5 : r;
}
