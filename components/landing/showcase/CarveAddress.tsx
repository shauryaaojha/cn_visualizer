"use client";

// Unit 2 — Addressing, on Animmaster Scroll Animation/44 (stack → spread →
// staggered flip).
//
// The demo stacks four cards, fans them out to 14/38/62/86% with tilts of
// ±15/±7.5°, then flips each one front-to-back with a small stagger as the
// scroll continues. Here the stack *is* the /24: a covering card shows the
// address and its mask, lifts away, and the four cards underneath fan out as
// the four /26 subnets you get by borrowing two bits — then each flips to
// show its network, usable range and broadcast address.
//
// Changes from the demo: GSAP ScrollTrigger + pin → framer-motion transforms
// on the landing page's scroll; photo backs → real subnet maths; the tilts
// settle to 0° as the card flips so the backs are readable.

import { motion, useTransform, type MotionValue } from "framer-motion";
import { PALETTE } from "@/lib/palette";
import { STEP_AT, type ShowStep } from "./ScrollShowcase";

export const CARVE_STEPS: ShowStep[] = [
  {
    tag: "32 bits",
    title: "Read the address",
    detail:
      "192.168.1.0 is really 32 bits, four octets of 8. Every rule in this unit is about where you draw a line through them.",
  },
  {
    tag: "/24",
    title: "Apply the mask",
    detail:
      "A /24 mask says the first 24 bits name the network and the last 8 name the host: 256 addresses, 254 usable.",
  },
  {
    tag: "/26",
    title: "Borrow two bits",
    detail: "Borrow 2 host bits and the one /24 fans out into four /26 subnets of 64 addresses each.",
  },
  {
    tag: "ranges",
    title: "Read each subnet",
    detail:
      "Flip each /26: its network address, the usable hosts in between, and the broadcast at the end. 62 hosts per subnet.",
  },
];

const N = CARVE_STEPS.length;
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

// The demo's layout: spread positions and tilts.
const SPREAD_X = [-195, -65, 65, 195];
const TILT = [-15, -7.5, 7.5, 15];
const COLORS = [PALETTE.data, PALETTE.note, PALETTE.ok, PALETTE.control];
const SUBNETS = [0, 64, 128, 192].map((b) => ({
  net: b,
  first: b + 1,
  last: b + 62,
  bcast: b + 63,
}));
const BITS = "11000000101010000000000100000000".split("");

const CARD_W = 124;
const CARD_H = 186;

export function CarveAddress({ progress, reduce }: { progress: MotionValue<number>; reduce: boolean }) {
  const lift = useTransform(progress, (p) => (reduce ? 1 : seg(p, STEP_AT(2, N) - 0.04, STEP_AT(2, N) + 0.06)));
  const coverY = useTransform(lift, (v) => -v * 140);
  const coverO = useTransform(lift, (v) => 1 - v);
  const maskOn = useTransform(progress, (p): number => (reduce || p >= STEP_AT(1, N) ? 1 : 0));

  return (
    <div className="relative h-[440px] w-[520px] [perspective:1000px]">
      {SUBNETS.map((s, i) => (
        <SubnetCard key={s.net} i={i} progress={progress} reduce={reduce} />
      ))}

      {/* the covering /24 card — centred by flex, since framer owns its transform */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <motion.div
          className="flex w-[440px] flex-col gap-3 rounded-xl border-2 bg-surface-container p-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
          style={{ y: coverY, opacity: coverO, borderColor: PALETTE.data }}
        >
          <p className="font-label-caps text-[11px] uppercase text-on-surface-variant">One network</p>
          <p className="font-mono text-[26px] font-bold text-on-surface">
            192.168.1.0<motion.span style={{ opacity: maskOn, color: PALETTE.data }}>/24</motion.span>
          </p>
          <div className="flex flex-wrap gap-[2px]">
            {BITS.map((b, i) => (
              <Bit key={i} i={i} b={b} maskOn={maskOn} />
            ))}
          </div>
          <motion.p className="font-sans text-[13px] text-on-surface-variant" style={{ opacity: maskOn }}>
            <span style={{ color: PALETTE.data }}>24 network bits</span> ·{" "}
            <span style={{ color: PALETTE.note }}>8 host bits</span> · 256 addresses
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}

function Bit({ i, b, maskOn }: { i: number; b: string; maskOn: MotionValue<number> }) {
  const net = i < 24;
  const color = useTransform(maskOn, (m) => (m ? (net ? PALETTE.data : PALETTE.note) : PALETTE.chalk));
  const bg = useTransform(maskOn, (m) =>
    m ? (net ? `${PALETTE.data}26` : `${PALETTE.note}22`) : "rgba(243,241,231,0.06)",
  );
  return (
    <motion.span
      className={`flex h-7 w-[10px] items-center justify-center rounded-[2px] font-mono text-[12px] font-bold ${i % 8 === 7 ? "mr-[5px]" : ""}`}
      style={{ color, backgroundColor: bg }}
    >
      {b}
    </motion.span>
  );
}

function SubnetCard({ i, progress, reduce }: { i: number; progress: MotionValue<number>; reduce: boolean }) {
  const s = SUBNETS[i];
  const color = COLORS[i];
  const spreadStart = STEP_AT(2, N) + 0.02;
  const spreadEnd = STEP_AT(3, N) - 0.02;
  // Staggered flip, like the demo: each card starts its turn a little later.
  const flipStart = STEP_AT(3, N) + i * 0.035;
  const flipEnd = flipStart + 0.09;

  const spread = useTransform(progress, (p) => (reduce ? 1 : seg(p, spreadStart, spreadEnd)));
  const flip = useTransform(progress, (p) => (reduce ? 1 : seg(p, flipStart, flipEnd)));
  const x = useTransform(spread, (v) => SPREAD_X[i] * v);
  const rotate = useTransform([spread, flip], ([a, f]: number[]) => TILT[i] * a * (1 - f));
  const front = useTransform(flip, (f) => `rotateY(${-180 * f}deg)`);
  const back = useTransform(flip, (f) => `rotateY(${180 - 180 * f}deg)`);

  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{ x, rotate, width: CARD_W, height: CARD_H, marginLeft: -CARD_W / 2, marginTop: -CARD_H / 2 }}
    >
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border-2 bg-surface-container [backface-visibility:hidden]"
        style={{ transform: front, borderColor: color }}
      >
        <span className="font-label-caps text-[11px] uppercase text-on-surface-variant">Subnet {i + 1}</span>
        <span className="font-mono text-[28px] font-bold" style={{ color }}>
          .{s.net}
        </span>
        <span className="font-mono text-[15px] text-on-surface">/26</span>
        <span className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-surface-dim">
          <span
            className="block h-full rounded-full"
            style={{ width: "25%", marginLeft: `${i * 25}%`, background: color }}
          />
        </span>
      </motion.div>
      <motion.div
        className="absolute inset-0 flex flex-col justify-center gap-1.5 rounded-xl border-2 px-3 [backface-visibility:hidden]"
        style={{ transform: back, borderColor: color, background: `${color}1c` }}
      >
        <Row k="network" v={`.${s.net}`} color={color} />
        <Row k="first" v={`.${s.first}`} />
        <Row k="last" v={`.${s.last}`} />
        <Row k="broadcast" v={`.${s.bcast}`} color={color} />
        <span className="mt-1 text-center font-sans text-[12px] text-on-surface-variant">62 hosts</span>
      </motion.div>
    </motion.div>
  );
}

function Row({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="font-sans text-[11px] text-on-surface-variant">{k}</span>
      <span className="font-mono text-[14px] font-bold" style={{ color: color ?? PALETTE.chalk }}>
        {v}
      </span>
    </div>
  );
}
