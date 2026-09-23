"use client";

// Unit 3 — Routing. Six routers, weighted links, and router A's table:
//   1. A only knows its neighbours
//   2. neighbours share their tables (one round of distance vector)
//   3. converged — the cheapest path to F lights up (cost 7)
//   4. link C–E fails — the tables reroute (cost 8)
// Every number is the real Bellman-Ford result for this graph.

import { motion } from "framer-motion";
import { PALETTE } from "@/lib/palette";
import type { ShowStep } from "./ScrollShowcase";

export const PATH_STEPS: ShowStep[] = [
  {
    tag: "hello",
    title: "Know your neighbours",
    detail: "Router A starts knowing only the routers it touches: B at cost 2 and C at cost 5. The rest of the network is a blank.",
  },
  {
    tag: "round 1",
    title: "Share tables",
    detail: "Every router sends its table to its neighbours. A learns C is cheaper through B (2 + 1 = 3), and hears about D and E for the first time.",
  },
  {
    tag: "cost 7",
    title: "Converge",
    detail: "After a few rounds nothing changes any more — the tables have converged. A reaches F via B → C → E for a total cost of 7.",
  },
  {
    tag: "reroute",
    title: "Survive a failure",
    detail: "Link C–E goes down. The routers re-share, and A's route to F moves to B → D → F at cost 8. Nobody had to be told the whole map.",
  },
];

const NODES: Record<string, { x: number; y: number }> = {
  A: { x: 50, y: 150 },
  B: { x: 170, y: 60 },
  C: { x: 170, y: 240 },
  D: { x: 310, y: 60 },
  E: { x: 310, y: 240 },
  F: { x: 430, y: 150 },
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
const PATHS = [[], [], ["A", "B", "C", "E", "F"], ["A", "B", "D", "F"]];
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

const onPath = (path: string[], a: string, b: string) => {
  for (let i = 0; i < path.length - 1; i++) {
    if ((path[i] === a && path[i + 1] === b) || (path[i] === b && path[i + 1] === a)) return true;
  }
  return false;
};

export function FindPath({ active }: { active: number }) {
  const path = PATHS[active];
  const known = new Set(TABLES[active].map((r) => r[0]).concat("A"));

  return (
    <div className="flex w-[480px] flex-col gap-4">
      <svg viewBox="0 0 480 300" className="w-full overflow-visible">
        {LINKS.map(([a, b, cost]) => {
          const p = NODES[a];
          const q = NODES[b];
          const down = active === 3 && ((a === "C" && b === "E") || (a === "E" && b === "C"));
          const lit = onPath(path, a, b);
          return (
            <g key={a + b}>
              <motion.line
                x1={p.x}
                y1={p.y}
                x2={q.x}
                y2={q.y}
                animate={{
                  stroke: down ? PALETTE.fail : lit ? PALETTE.data : PALETTE.wire,
                  strokeWidth: lit ? 4 : 2,
                  opacity: down ? 0.8 : lit ? 1 : 0.55,
                }}
                strokeDasharray={down ? "6 6" : undefined}
                transition={{ duration: 0.4 }}
              />
              <g transform={`translate(${(p.x + q.x) / 2}, ${(p.y + q.y) / 2})`}>
                <rect x={-11} y={-10} width={22} height={20} rx={4} fill="#1E4234" />
                <text textAnchor="middle" dy={5} fontSize={13} fontFamily="var(--font-jetbrains-mono)" fill={down ? PALETTE.fail : PALETTE.muted}>
                  {down ? "✕" : cost}
                </text>
              </g>
            </g>
          );
        })}
        {/* round-1 table exchanges: dots running along A's links */}
        {active === 1 &&
          ["B", "C"].map((n, i) => (
            <motion.circle
              key={n}
              r={5}
              fill={PALETTE.note}
              initial={{ cx: NODES[n].x, cy: NODES[n].y }}
              animate={{ cx: [NODES[n].x, NODES.A.x], cy: [NODES[n].y, NODES.A.y] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
            />
          ))}
        {Object.entries(NODES).map(([id, p]) => {
          const isA = id === "A";
          const lit = path.includes(id);
          const seen = known.has(id);
          return (
            <g key={id} transform={`translate(${p.x}, ${p.y})`}>
              <motion.circle
                r={22}
                animate={{
                  fill: isA ? `${PALETTE.data}33` : lit ? `${PALETTE.data}22` : "#2A5A47",
                  stroke: isA || lit ? PALETTE.data : seen ? PALETTE.chalk : PALETTE.wire,
                  opacity: seen || active > 1 ? 1 : 0.45,
                }}
                strokeWidth={2}
                transition={{ duration: 0.35 }}
              />
              <text textAnchor="middle" dy={6} fontSize={18} fontWeight={700} fontFamily="var(--font-kalam)" fill={PALETTE.chalk}>
                {id}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Router A's table */}
      <div className="mx-auto w-72 rounded-lg border border-outline-variant bg-surface-container/80 p-3">
        <p className="mb-1.5 font-label-caps text-[11px] uppercase text-on-surface-variant">Router A&apos;s table</p>
        <div className="grid grid-cols-3 gap-y-1 font-mono text-[13px]">
          <span className="text-on-surface-variant">dest</span>
          <span className="text-on-surface-variant">cost</span>
          <span className="text-on-surface-variant">via</span>
          {TABLES[active].map(([d, c, v]) => {
            const fresh = !TABLES[Math.max(0, active - 1)].some((r) => r[0] === d && r[1] === c) || active === 0;
            return (
              <motion.div
                key={`${d}-${c}`}
                className="contents"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span className="text-on-surface">{d}</span>
                <span style={{ color: fresh && active > 0 ? PALETTE.data : PALETTE.chalk }}>{c}</span>
                <span className="text-on-surface-variant">{v}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
