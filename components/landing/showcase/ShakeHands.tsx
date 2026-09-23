"use client";

// Unit 5 — Transport & Application. What happens when you open a page, as a
// ladder diagram (time runs down):
//   1. DNS turns the name into an address
//   2. TCP's three-way handshake opens the connection
//   3. HTTP asks for the page
//   4. the server answers
// Each arrow draws itself as its step is reached, so the ladder grows as you
// scroll — the order of messages is the whole lesson.

import { motion } from "framer-motion";
import { PALETTE } from "@/lib/palette";
import type { ShowStep } from "./ScrollShowcase";

export const HANDSHAKE_STEPS: ShowStep[] = [
  {
    tag: "DNS",
    title: "Find the address",
    detail: "Your browser only knows a name. It asks DNS — \"where is cn.example?\" — and gets back 93.184.216.34 before a single TCP byte is sent.",
  },
  {
    tag: "SYN",
    title: "Shake hands",
    detail: "TCP opens the connection in three messages: SYN, SYN-ACK, ACK. Both sides now agree on starting sequence numbers.",
  },
  {
    tag: "GET",
    title: "Ask for the page",
    detail: "Only now does HTTP speak: GET /index.html, carried inside TCP segments on port 80 (443 for HTTPS).",
  },
  {
    tag: "200",
    title: "Get the answer",
    detail: "The server replies 200 OK with the page. TCP numbers and acknowledges every segment so nothing arrives missing or out of order.",
  },
];

const X = { you: 70, dns: 240, web: 410 };
const TOP = 56;
const ROW = 44;

type Msg = { from: keyof typeof X; to: keyof typeof X; label: string; color: string; step: number };
const MSGS: Msg[] = [
  { from: "you", to: "dns", label: "where is cn.example?", color: PALETTE.protocol, step: 0 },
  { from: "dns", to: "you", label: "93.184.216.34", color: PALETTE.protocol, step: 0 },
  { from: "you", to: "web", label: "SYN", color: PALETTE.control, step: 1 },
  { from: "web", to: "you", label: "SYN-ACK", color: PALETTE.control, step: 1 },
  { from: "you", to: "web", label: "ACK", color: PALETTE.control, step: 1 },
  { from: "you", to: "web", label: "GET /index.html", color: PALETTE.data, step: 2 },
  { from: "web", to: "you", label: "200 OK · page", color: PALETTE.ok, step: 3 },
];

export function ShakeHands({ active }: { active: number }) {
  const height = TOP + MSGS.length * ROW + 20;
  return (
    <svg viewBox={`0 0 480 ${height}`} className="w-[480px] overflow-visible">
      {(Object.keys(X) as (keyof typeof X)[]).map((k) => (
        <g key={k}>
          <text
            x={X[k]}
            y={20}
            textAnchor="middle"
            fontSize={16}
            fontWeight={700}
            fontFamily="var(--font-kalam)"
            fill={PALETTE.chalk}
          >
            {k === "you" ? "Your laptop" : k === "dns" ? "DNS server" : "Web server"}
          </text>
          <line x1={X[k]} x2={X[k]} y1={32} y2={height} stroke={PALETTE.wire} strokeWidth={2} strokeDasharray="4 6" />
        </g>
      ))}

      {MSGS.map((m, i) => {
        const shown = m.step <= active;
        const y1 = TOP + i * ROW;
        const y2 = y1 + ROW * 0.6;
        const x1 = X[m.from];
        const x2 = X[m.to];
        const dir = Math.sign(x2 - x1);
        // Delay within the step, so the three handshake arrows draw in order.
        const order = MSGS.filter((o) => o.step === m.step).indexOf(m);
        return (
          <g key={i}>
            <motion.path
              d={`M ${x1} ${y1} L ${x2 - dir * 6} ${y2}`}
              stroke={m.color}
              strokeWidth={2.5}
              fill="none"
              initial={false}
              animate={{ pathLength: shown ? 1 : 0, opacity: shown ? 1 : 0 }}
              transition={{ duration: 0.5, delay: shown ? order * 0.35 : 0 }}
            />
            <motion.polygon
              points={`${x2},${y2} ${x2 - dir * 10},${y2 - 5} ${x2 - dir * 10},${y2 + 5}`}
              fill={m.color}
              initial={false}
              animate={{ opacity: shown ? 1 : 0 }}
              transition={{ delay: shown ? order * 0.35 + 0.45 : 0 }}
            />
            <motion.text
              x={(x1 + x2) / 2}
              y={(y1 + y2) / 2 - 7}
              textAnchor="middle"
              fontSize={13}
              fontFamily="var(--font-jetbrains-mono)"
              fill={m.color}
              // A board-coloured halo knocks the dashed lifelines out behind the label.
              stroke="#24503F"
              strokeWidth={5}
              paintOrder="stroke"
              initial={false}
              animate={{ opacity: shown ? 1 : 0 }}
              transition={{ delay: shown ? order * 0.35 + 0.25 : 0 }}
            >
              {m.label}
            </motion.text>
          </g>
        );
      })}
    </svg>
  );
}
