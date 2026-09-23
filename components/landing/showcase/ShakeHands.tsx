"use client";

// Unit 5 — Transport & Application, on Animmaster Scroll Animation/38
// (sticky cards: a front card flips with an elastic spring to reveal a
// tilted deck, then the cards are flicked off one by one as you scroll).
//
// Every card in the deck is one message of opening a web page — DNS query,
// DNS answer, SYN, SYN-ACK, ACK, GET, 200 OK — and the order they fly off is
// the order they are sent. When the deck is empty, the page has loaded.
//
// Kept from the demo: the elastic flip (spring with low damping) triggered at
// a scroll threshold, per-card tilt angles, scrubbed dismissal where each
// card rises and over-rotates on its own slice of the scroll. Changed:
// GSAP/Lenis/pin → framer-motion on the page's scroll; four image cards →
// seven message cards with sender, receiver and meaning.

import { motion, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import { useState } from "react";
import { PALETTE } from "@/lib/palette";
import { STEP_AT, type ShowStep } from "./ScrollShowcase";

export const HANDSHAKE_STEPS: ShowStep[] = [
  {
    tag: "DNS",
    title: "Find the address",
    detail:
      'Your browser only knows a name. It asks DNS "where is cn.example?" and gets back 93.184.216.34 before a single TCP byte is sent.',
  },
  {
    tag: "SYN",
    title: "Shake hands",
    detail:
      "TCP opens the connection in three messages: SYN, SYN-ACK, ACK. Both sides now agree on starting sequence numbers.",
  },
  {
    tag: "GET",
    title: "Ask for the page",
    detail: "Only now does HTTP speak: GET /index.html, carried inside TCP segments to port 80 (443 for HTTPS).",
  },
  {
    tag: "200",
    title: "Get the answer",
    detail:
      "The server replies 200 OK with the page. TCP numbers and acknowledges every segment, so nothing arrives missing or out of order.",
  },
];

const N = HANDSHAKE_STEPS.length;
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

type Msg = { label: string; from: string; to: string; note: string; color: string; step: number };
const MSGS: Msg[] = [
  { label: "DNS query", from: "laptop", to: "DNS", note: "where is cn.example?", color: PALETTE.protocol, step: 0 },
  { label: "DNS reply", from: "DNS", to: "laptop", note: "93.184.216.34", color: PALETTE.protocol, step: 0 },
  { label: "SYN", from: "laptop", to: "server", note: "seq = 1000", color: PALETTE.control, step: 1 },
  { label: "SYN-ACK", from: "server", to: "laptop", note: "seq = 5000, ack = 1001", color: PALETTE.control, step: 1 },
  { label: "ACK", from: "laptop", to: "server", note: "ack = 5001 · connected", color: PALETTE.control, step: 1 },
  { label: "GET", from: "laptop", to: "server", note: "/index.html · port 80", color: PALETTE.data, step: 2 },
  { label: "200 OK", from: "server", to: "laptop", note: "here's the page", color: PALETTE.ok, step: 3 },
];
// The demo's tilts, extended to seven cards.
const TILT = [-10, -20, -5, 10, -14, 6, -3];
const DISMISS_TILT = [-50, -60, -45, 50, -55, 45, -40];

// Each message gets its own slice of its step's scroll.
const SLICES = MSGS.map((m) => {
  const same = MSGS.filter((o) => o.step === m.step);
  const k = same.indexOf(m);
  const a = STEP_AT(m.step, N);
  const b = STEP_AT(m.step + 1, N);
  // Step 0 also has to leave room for the flip at its start.
  const start = m.step === 0 ? a + 0.07 : a;
  const len = (b - start) / same.length;
  return [start + k * len, start + (k + 1) * len] as const;
});
const FLIP_AT = STEP_AT(0, N) + 0.03;

const CW = 230;
const CH = 300;

export function ShakeHands({ progress, reduce }: { progress: MotionValue<number>; reduce: boolean }) {
  const [flipped, setFlipped] = useState(reduce);
  useMotionValueEvent(progress, "change", (p) => {
    const f = reduce || p > FLIP_AT;
    setFlipped((v) => (v === f ? v : f));
  });
  const spring = { type: "spring" as const, stiffness: 260, damping: 12 };

  return (
    <div className="relative h-[440px] w-[480px] [perspective:1200px]">
      {/* what's left when every message has gone */}
      <div
        className="absolute left-1/2 top-1/2 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed"
        style={{ width: CW, height: CH, marginLeft: -CW / 2, marginTop: -CH / 2, borderColor: `${PALETTE.ok}88` }}
      >
        <span className="font-hand text-[28px] font-bold" style={{ color: PALETTE.ok }}>
          Page loaded
        </span>
        <span className="font-mono text-[13px] text-on-surface-variant">7 messages · 3 protocols</span>
      </div>

      {/* the deck — last message at the bottom, first on top */}
      {[...MSGS]
        .map((m, i) => ({ m, i }))
        .reverse()
        .map(({ m, i }) => (
          <MessageCard
            key={m.label}
            m={m}
            i={i}
            progress={progress}
            flipped={flipped}
            spring={spring}
            reduce={reduce}
          />
        ))}

      {/* the front card */}
      <motion.div
        className="absolute left-1/2 top-1/2 flex flex-col justify-between rounded-xl border-2 bg-surface-container p-5 [backface-visibility:hidden]"
        style={{ width: CW, height: CH, marginLeft: -CW / 2, marginTop: -CH / 2, borderColor: PALETTE.data }}
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={reduce ? { duration: 0 } : spring}
      >
        <span className="font-label-caps text-[11px] uppercase text-on-surface-variant">You type</span>
        <span className="font-mono text-[26px] font-bold text-on-surface">cn.example</span>
        <span className="font-sans text-[14px] text-on-surface-variant">
          and press Enter. Scroll to watch what your laptop sends.
        </span>
      </motion.div>
    </div>
  );
}

function MessageCard({
  m,
  i,
  progress,
  flipped,
  spring,
  reduce,
}: {
  m: Msg;
  i: number;
  progress: MotionValue<number>;
  flipped: boolean;
  spring: { type: "spring"; stiffness: number; damping: number };
  reduce: boolean;
}) {
  const [a, b] = SLICES[i];
  const d = useTransform(progress, (p) => (reduce ? 1 : clamp01((p - a) / (b - a))));
  const y = useTransform(d, (v) => `${-250 * v}%`);
  const rotate = useTransform(d, (v) => TILT[i] + (DISMISS_TILT[i] - TILT[i]) * v);
  const opacity = useTransform(d, (v) => 1 - Math.max(0, v - 0.7) / 0.3);

  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{ width: CW, height: CH, marginLeft: -CW / 2, marginTop: -CH / 2, y, rotate, opacity }}
    >
      <motion.div
        className="flex h-full w-full flex-col justify-between rounded-xl border-2 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.3)] [backface-visibility:hidden]"
        style={{ borderColor: m.color, background: "#2E604C" }}
        initial={false}
        animate={{ rotateY: flipped ? 0 : -180 }}
        transition={reduce ? { duration: 0 } : { ...spring, delay: flipped ? i * 0.03 : 0 }}
      >
        <span className="font-label-caps text-[11px] uppercase text-on-surface-variant">Message {i + 1} of 7</span>
        <span className="font-mono text-[30px] font-bold leading-tight" style={{ color: m.color }}>
          {m.label}
        </span>
        <div className="flex items-center gap-2 font-sans text-[14px] text-on-surface">
          <span className="rounded bg-surface-dim px-2 py-0.5">{m.from}</span>
          <span style={{ color: m.color }}>→</span>
          <span className="rounded bg-surface-dim px-2 py-0.5">{m.to}</span>
        </div>
        <span className="font-mono text-[13px] text-on-surface-variant">{m.note}</span>
      </motion.div>
    </motion.div>
  );
}
