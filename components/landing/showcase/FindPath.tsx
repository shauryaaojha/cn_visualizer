"use client";

// Unit 3 — Routing, on Animmaster Scroll Animation/42 (3D cubes flying in
// from deep z, spinning, into formation).
//
// In the demo, cubes start ~30 000px behind the screen with full turns on
// every axis and scrub into a composed layout. Here the cubes are routers:
// they fly in and settle into the network's topology, then the links draw
// themselves, tables are exchanged, the cheapest path lights up and — when
// link C–E fails — moves. Router A's distance-vector table is underneath,
// with the real Bellman-Ford numbers for this graph.
//
// Changes from the demo: GSAP + Lenis + pin → framer-motion transforms on
// the page's scroll; image faces → labelled router faces; the fly-in depth
// is 2 600px (not 30 000) so the spin is readable in a section-sized stage.

import { motion, useTransform, type MotionValue } from "framer-motion";
import { PALETTE } from "@/lib/palette";
import { STEP_AT, type ShowStep } from "./ScrollShowcase";

export const PATH_STEPS: ShowStep[] = [
  {
    tag: "hello",
    title: "Routers come online",
    detail:
      "Six routers power up. Each one knows only the links plugged into it, and router A can see just B (cost 2) and C (cost 5).",
  },
  {
    tag: "round 1",
    title: "Share tables",
    detail:
      "Every router sends its table to its neighbours. A learns C is cheaper through B (2 + 1 = 3), and hears about D and E for the first time.",
  },
  {
    tag: "cost 7",
    title: "Converge",
    detail:
      "After a few rounds nothing changes any more: the tables have converged. A reaches F via B → C → E for a total cost of 7.",
  },
  {
    tag: "reroute",
    title: "Survive a failure",
    detail:
      "Link C–E goes down. The routers re-share, and A's route to F moves to B → D → F at cost 8. Nobody was ever told the whole map.",
  },
];

const N = PATH_STEPS.length;
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

const W = 500;
const H = 280;
const NODES: Record<string, { x: number; y: number }> = {
  A: { x: 50, y: 140 },
  B: { x: 180, y: 50 },
  C: { x: 180, y: 230 },
  D: { x: 320, y: 50 },
  E: { x: 320, y: 230 },
  F: { x: 450, y: 140 },
};
// Where each cube starts, in the spirit of cubesData.js: off-stage, deep, spun.
const FROM: Record<string, { x: number; y: number; rx: number; ry: number; rz: number }> = {
  A: { x: 120, y: -260, rx: 360, ry: -360, rz: -48 },
  B: { x: -140, y: -220, rx: -360, ry: 360, rz: 90 },
  C: { x: 90, y: 260, rx: -360, ry: -360, rz: -180 },
  D: { x: -60, y: -300, rx: 360, ry: 360, rz: 120 },
  E: { x: -120, y: 240, rx: -360, ry: 360, rz: -90 },
  F: { x: -200, y: -80, rx: 360, ry: -360, rz: 60 },
};
const LINKS: [string, string, number][] = [
  ["A", "B", 2],
  ["A", "C", 5],
  ["B", "C", 1],
  ["B", "D", 4],
  ["C", "E", 3],
  ["D", "E", 1],
  ["D", "F", 2],
  ["E", "F", 1],
];
const BEST = ["A", "B", "C", "E", "F"];
const AFTER = ["A", "B", "D", "F"];
const TABLES: [string, string, string][][] = [
  [
    ["B", "2", "B"],
    ["C", "5", "C"],
  ],
  [
    ["B", "2", "B"],
    ["C", "3", "B"],
    ["D", "6", "B"],
    ["E", "8", "C"],
  ],
  [
    ["B", "2", "B"],
    ["C", "3", "B"],
    ["D", "6", "B"],
    ["E", "6", "B"],
    ["F", "7", "B"],
  ],
  [
    ["B", "2", "B"],
    ["C", "3", "B"],
    ["D", "6", "B"],
    ["E", "7", "B"],
    ["F", "8", "B"],
  ],
];

const onPath = (path: string[], a: string, b: string) =>
  path.some((n, i) => i < path.length - 1 && ((n === a && path[i + 1] === b) || (n === b && path[i + 1] === a)));

export function FindPath({
  active,
  progress,
  reduce,
}: {
  active: number;
  progress: MotionValue<number>;
  reduce: boolean;
}) {
  const linksIn = useTransform(progress, (p) => (reduce ? 1 : seg(p, STEP_AT(0, N) + 0.14, STEP_AT(1, N) + 0.03)));
  const path = active >= 3 ? AFTER : active >= 2 ? BEST : [];

  return (
    <div className="flex w-[520px] flex-col items-center gap-4">
      <div className="relative [perspective:900px]" style={{ width: W, height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible">
          {LINKS.map(([a, b, cost], i) => (
            <Link
              key={a + b}
              a={a}
              b={b}
              cost={cost}
              i={i}
              linksIn={linksIn}
              lit={onPath(path, a, b)}
              down={active >= 3 && a === "C" && b === "E"}
            />
          ))}
          {active === 1 &&
            ["B", "C"].map((n, i) => (
              <motion.circle
                key={n}
                r={5}
                fill={PALETTE.note}
                animate={{ cx: [NODES[n].x, NODES.A.x], cy: [NODES[n].y, NODES.A.y] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
              />
            ))}
        </svg>
        {Object.keys(NODES).map((id, i) => (
          <Cube key={id} id={id} i={i} progress={progress} reduce={reduce} lit={path.includes(id) || id === "A"} />
        ))}
      </div>

      <div className="w-72 rounded-lg border border-outline-variant bg-surface-container/80 p-3">
        <p className="mb-1.5 font-label-caps text-[11px] uppercase text-on-surface-variant">Router A&apos;s table</p>
        <div className="grid grid-cols-3 gap-y-1 font-mono text-[13px]">
          <span className="text-on-surface-variant">dest</span>
          <span className="text-on-surface-variant">cost</span>
          <span className="text-on-surface-variant">via</span>
          {TABLES[active].map(([d, c, v]) => {
            const changed = active > 0 && !TABLES[active - 1].some((r) => r[0] === d && r[1] === c);
            return (
              <motion.div key={`${active}-${d}`} className="contents" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <span className="text-on-surface">{d}</span>
                <span style={{ color: changed ? PALETTE.data : PALETTE.chalk }}>{c}</span>
                <span className="text-on-surface-variant">{v}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Link({
  a,
  b,
  cost,
  i,
  linksIn,
  lit,
  down,
}: {
  a: string;
  b: string;
  cost: number;
  i: number;
  linksIn: MotionValue<number>;
  lit: boolean;
  down: boolean;
}) {
  const p = NODES[a];
  const q = NODES[b];
  // Links draw in one after another once the cubes have landed.
  const drawn = useTransform(linksIn, (v) => clamp01(v * 1.6 - i * 0.08));
  return (
    <g>
      <motion.line
        x1={p.x}
        y1={p.y}
        x2={q.x}
        y2={q.y}
        style={{ pathLength: drawn, opacity: drawn }}
        animate={{ stroke: down ? PALETTE.fail : lit ? PALETTE.data : PALETTE.wire, strokeWidth: lit ? 4 : 2 }}
        strokeDasharray={down ? "6 6" : undefined}
        transition={{ duration: 0.4 }}
      />
      <motion.g style={{ opacity: drawn }} transform={`translate(${(p.x + q.x) / 2}, ${(p.y + q.y) / 2})`}>
        <rect x={-11} y={-10} width={22} height={20} rx={4} fill="#1E4234" />
        <text
          textAnchor="middle"
          dy={5}
          fontSize={13}
          fontFamily="var(--font-jetbrains-mono)"
          fill={down ? PALETTE.fail : PALETTE.muted}
        >
          {down ? "✕" : cost}
        </text>
      </motion.g>
    </g>
  );
}

const S = 46; // cube edge

function Cube({
  id,
  i,
  progress,
  reduce,
  lit,
}: {
  id: string;
  i: number;
  progress: MotionValue<number>;
  reduce: boolean;
  lit: boolean;
}) {
  const to = NODES[id];
  const from = FROM[id];
  // Staggered fly-in across the first step.
  const k = useTransform(progress, (p) =>
    reduce ? 1 : ease(seg(p, 0.0 + i * 0.018, STEP_AT(0, N) + 0.13 + i * 0.018)),
  );
  const x = useTransform(k, (v) => to.x - S / 2 + from.x * (1 - v));
  const y = useTransform(k, (v) => to.y - S / 2 + from.y * (1 - v));
  const z = useTransform(k, (v) => -2600 * (1 - v));
  const rx = useTransform(k, (v) => from.rx * (1 - v) - 18 * v);
  const ry = useTransform(k, (v) => from.ry * (1 - v) + 24 * v);
  const rz = useTransform(k, (v) => from.rz * (1 - v));
  const opacity = useTransform(k, (v) => Math.min(1, v * 3));

  const color = lit ? PALETTE.data : PALETTE.chalk;
  const face = (t: string) => (
    <div
      className="absolute inset-0 flex items-center justify-center rounded-md border-2 font-hand text-[22px] font-bold"
      style={{
        transform: t,
        borderColor: color,
        background: lit ? `${PALETTE.data}30` : "#2E604C",
        color,
        backfaceVisibility: "hidden",
      }}
    >
      {id}
    </div>
  );
  return (
    <motion.div
      className="absolute left-0 top-0 [transform-style:preserve-3d]"
      style={{ x, y, z, rotateX: rx, rotateY: ry, rotateZ: rz, opacity, width: S, height: S }}
    >
      {face(`translateZ(${S / 2}px)`)}
      {face(`rotateY(180deg) translateZ(${S / 2}px)`)}
      {face(`rotateY(90deg) translateZ(${S / 2}px)`)}
      {face(`rotateY(-90deg) translateZ(${S / 2}px)`)}
      {face(`rotateX(90deg) translateZ(${S / 2}px)`)}
      {face(`rotateX(-90deg) translateZ(${S / 2}px)`)}
    </motion.div>
  );
}
