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
import { factSelection } from "@/components/visualizer/lesson/FactBody";
import { linkFact, nodeFact } from "@/engines/netFacts";
import { useLessonUi, type Selection } from "@/lib/lessonUiStore";
import { useNetStore } from "@/lib/netStore";
import { PALETTE } from "@/lib/palette";
import type { CellState, LinkState, NetLink, NetNode, NetPanel, Packet } from "@/types/visualization";

/** Something on a network canvas the student clicked. */
export type NetPick = { type: "node"; node: NetNode; panel: NetPanel } | { type: "link"; link: NetLink; panel: NetPanel };

/** The default Inspector card for a clicked node or link. */
export function netSelection(pick: NetPick): Selection {
  if (pick.type === "node") {
    const f = nodeFact(pick.node, pick.panel);
    return factSelection(`${pick.panel.id}-n-${pick.node.id}`, f.kind, f.title, PALETTE.note, f.spec);
  }
  const f = linkFact(pick.link, pick.panel);
  const color = pick.link.state === "down" ? PALETTE.fail : PALETTE.data;
  return factSelection(`${pick.panel.id}-l-${pick.link.id}`, f.kind, f.title, color, f.spec);
}

const NODE_STYLE: Record<CellState, string> = {
  idle: "border-outline bg-surface-container/90 text-on-surface",
  active: "border-primary bg-primary/15 text-primary shadow-[0_0_18px_rgba(240,210,100,0.55)]",
  visited: "border-primary/45 bg-surface-container/90 text-primary/80",
  new: "border-mint bg-mint/10 text-mint",
  removing: "border-coral bg-coral/10 text-coral",
  target: "border-amber bg-amber/15 text-amber",
  found: "border-mint bg-mint/20 text-mint animate-ok-pulse",
  failed: "border-coral bg-coral/20 text-coral animate-fail-pulse",
};

const LINK_STYLE: Record<LinkState, { color: string; width: number; dash?: string; opacity: number; flow?: boolean }> =
  {
    // An idle wire is chalk drawn lightly; an active one is gone over again.
    idle: { color: PALETTE.wire, width: 1.6, opacity: 0.7 },
    active: { color: PALETTE.data, width: 3, opacity: 1, flow: true },
    reserved: { color: PALETTE.data, width: 2.2, opacity: 0.5 },
    congested: { color: PALETTE.control, width: 2.6, opacity: 1, dash: "6 3" },
    down: { color: PALETTE.fail, width: 2, opacity: 0.9, dash: "4 5" },
  };

const PACKET_STYLE: Record<Packet["state"], string> = {
  flying: "border-primary bg-primary text-surface shadow-[0_0_14px_rgba(240,210,100,0.75)]",
  queued: "border-amber bg-amber/20 text-amber",
  delivered: "border-mint bg-mint text-surface shadow-[0_0_14px_rgba(185,227,154,0.65)]",
  dropped: "border-coral bg-coral text-surface animate-fail-pulse",
};

const SPRING = { type: "spring", stiffness: 190, damping: 24 } as const;

export function NetworkCanvas() {
  const step = useNetStore((s) => s.currentStep());
  const program = useNetStore((s) => s.program);
  const seek = useNetStore((s) => s.seek);
  const panels = step?.panels ?? [];
  // Clicking a link also jumps to the first frame a packet crosses it.
  const onPick = (pick: NetPick) => {
    if (pick.type !== "link" || !program) return;
    const i = program.steps.findIndex((st) =>
      st.panels.some((p) => p.id === pick.panel.id && p.packets.some((pk) => pk.linkId === pick.link.id)),
    );
    if (i >= 0) seek(i);
  };
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
            <NetGraphPanel key={p.id} panel={p} w={W} h={H} r={R} compact={multi} onPick={onPick} />
          ))}
        </div>

        {step?.strip && (
          <div className="flex items-center gap-2 self-center">
            <span className="shrink-0 font-label-caps text-[12px] uppercase tracking-wider text-on-surface-variant/60">
              {step.strip.label}
            </span>
            <div className="flex max-w-[560px] flex-wrap gap-1">
              {step.strip.chips.map((c, i) => (
                <span
                  key={i}
                  className="flex h-6 items-center justify-center border border-outline-variant/50 px-1.5 font-mono text-[12px] text-on-surface-variant/80"
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
              className={`flex items-center self-center rounded-full border-[1.5px] border-dashed px-4 py-1.5 font-hand text-[15px] font-bold backdrop-blur-sm ${
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

export function NetGraphPanel({
  panel,
  w,
  h,
  r,
  compact,
  protocolPackets,
  inspect = netSelection,
  onPick,
}: {
  panel: NetPanel;
  w: number;
  h: number;
  r: number;
  compact: boolean;
  /** RoutingCanvas opts in so protocol packets use their reserved violet. */
  protocolPackets?: boolean;
  /** Builds the Inspector card for a click — canvases can supply richer ones. */
  inspect?: (pick: NetPick) => Selection;
  /** Side effect of a click, e.g. seeking to where that thing matters. */
  onPick?: (pick: NetPick) => void;
}) {
  const toggleSelect = useLessonUi((s) => s.toggleSelect);
  const selected = useLessonUi((s) => s.selection?.key);
  const pick = (p: NetPick) => {
    toggleSelect(inspect(p));
    onPick?.(p);
  };
  const pad = r + 8;
  const px = (x: number) => pad + (x / 100) * (w - pad * 2);
  const py = (y: number) => pad + (y / 100) * (h - pad * 2);
  const pos = new Map(panel.nodes.map((n) => [n.id, { x: px(n.x), y: py(n.y) }]));

  return (
    <motion.div
      animate={{ opacity: panel.dim ? 0.28 : 1 }}
      transition={{ duration: 0.35 }}
      className={`relative rounded-lg border-[1.5px] border-dashed bg-surface-container-low/45 backdrop-blur-sm ${
        panel.dim ? "border-outline-variant/40" : "border-outline-variant"
      }`}
      style={{ width: w, height: h + (compact ? 46 : 56) }}
    >
      {/* Panel header — the label a teacher writes above each sketch. */}
      <div className="flex items-baseline justify-between gap-2 border-b-[1.5px] border-dashed border-outline-variant/50 px-2.5 py-1.5">
        <span className={`font-hand font-bold text-primary ${compact ? "text-[13px]" : "text-[16px]"}`}>
          {panel.label}
        </span>
        {panel.sub && (
          <span className="truncate font-body-sm text-[12px] text-on-surface-variant/70">{panel.sub}</span>
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
            const isSel = selected === `${panel.id}-l-${l.id}`;
            return (
              <g
                key={l.id}
                role="button"
                tabIndex={0}
                aria-label={`Link ${l.from} to ${l.to}`}
                className="cursor-pointer outline-none"
                onClick={() => pick({ type: "link", link: l, panel })}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && pick({ type: "link", link: l, panel })}
              >
                {/* A fat invisible stroke, so a 2px chalk line is easy to hit. */}
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={14} />
                {isSel && (
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={PALETTE.note} strokeWidth={8} opacity={0.35} strokeLinecap="round" />
                )}
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
                    <circle cx={mx} cy={my} r={r * 0.5} fill={PALETTE.board} opacity={0.92} />
                    <path
                      d={`M${mx - r * 0.28},${my - r * 0.28} L${mx + r * 0.28},${my + r * 0.28} M${mx + r * 0.28},${my - r * 0.28} L${mx - r * 0.28},${my + r * 0.28}`}
                      stroke={PALETTE.fail}
                      strokeWidth={2.4}
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
          const isSel = selected === `${panel.id}-n-${n.id}`;
          return (
            <motion.div
              key={n.id}
              initial={false}
              animate={{ left: p.x - r, top: p.y - r }}
              transition={SPRING}
              className="absolute flex flex-col items-center"
              style={{ width: r * 2 }}
            >
              <button
                type="button"
                aria-label={`${n.kind} ${n.label}`}
                onClick={() => pick({ type: "node", node: n, panel })}
                className={`relative flex cursor-pointer items-center justify-center border-2 font-mono font-bold backdrop-blur-sm transition-all duration-300 hover:brightness-125 ${
                  infra ? "rounded-md" : "rounded-full"
                } ${NODE_STYLE[n.state]} ${isSel ? "outline outline-2 outline-offset-4 outline-note" : ""}`}
                style={{
                  width: r * 2,
                  height: r * 2,
                  fontSize: compact ? 12 : 13,
                }}
              >
                {n.ring && (
                  <span className="pointer-events-none absolute -inset-[4px] rounded-full border border-dashed border-primary/60" />
                )}
                {n.label}
              </button>
              {n.badge && (
                <span className="mt-0.5 whitespace-nowrap rounded bg-surface-container/80 px-1 font-mono text-[12px] text-amber">
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
          const pw = compact ? 36 : 44;
          const ph = compact ? 17 : 20;
          return (
            <motion.div
              key={pk.id}
              initial={false}
              animate={{ left: x, top: y }}
              transition={{ type: "tween", duration: 0.55, ease: "easeInOut" }}
              className={`pointer-events-none absolute z-10 flex items-center justify-center whitespace-nowrap rounded-sm border px-1 font-mono font-bold ${PACKET_STYLE[pk.state]}`}
              style={{
                x: "-50%",
                y: "-50%",
                minWidth: pw,
                height: ph,
                fontSize: 12,
                ...(protocolPackets && pk.kind === "control"
                  ? { borderColor: PALETTE.protocol, backgroundColor: PALETTE.protocol, color: PALETTE.board }
                  : {}),
              }}
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
              className={`rounded-full border-[1.5px] border-dashed px-2 py-0.5 font-hand text-[12px] font-bold ${
                panel.verdict.tone === "error"
                  ? "border-coral/70 bg-coral/10 text-coral"
                  : panel.verdict.tone === "ok"
                    ? "border-mint/70 bg-mint/10 text-mint"
                    : "border-amber/70 bg-amber/10 text-amber"
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
