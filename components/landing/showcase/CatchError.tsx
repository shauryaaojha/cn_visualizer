"use client";

// Unit 4 — Data Link & error control, on Animmaster Scroll Animation/45
// (character-dissolve band between stacked images).
//
// The demo stacks images and, as you scroll, wipes the top one away behind a
// band of scattered random characters. Here the two stacked "images" are two
// copies of the same Ethernet frame: the corrupted one on top, the clean
// retransmission underneath. You watch the frame get built, sent, and hit by
// noise — and then the CRC check dissolves the bad frame into garbage and the
// retransmitted copy (CRC ✓, ACK) is what's left.
//
// Kept from the demo: clip-path wipe driven by scroll, a band whose density
// falls off with distance and is scattered by per-cell hashed noise, cells
// toggled by visibility rather than re-rendered. Changed: GSAP/Lenis → a
// framer-motion scroll value; full-screen grid → a card-sized one; orange
// glyphs → chalk coral, the site's "something broke" colour.

import { motion, useMotionValueEvent, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useRef } from "react";
import { PALETTE } from "@/lib/palette";
import { STEP_AT, type ShowStep } from "./ScrollShowcase";

export const ERROR_STEPS: ShowStep[] = [
  {
    tag: "frame",
    title: "Build the frame",
    detail:
      "The data link layer wraps the packet: who it's for, who sent it, what's inside, and a 4-byte CRC computed over all of it.",
  },
  {
    tag: "bits",
    title: "Send the bits",
    detail: "The frame leaves as a stream of bits. The wire has no idea where one field ends and the next begins.",
  },
  {
    tag: "flip",
    title: "Noise strikes",
    detail: "Interference flips a single bit: a 1 arrives as a 0. Nobody on the wire can tell anything went wrong.",
  },
  {
    tag: "CRC ✗",
    title: "Drop it, resend it",
    detail:
      "The receiver's CRC doesn't match the FCS, so the frame is thrown away. No ACK comes back, the sender retransmits, and the clean copy is ACKed.",
  },
];

const N = ERROR_STEPS.length;
const FIELDS = [
  { label: "Preamble", bytes: 8, color: PALETTE.muted },
  { label: "Dst MAC", bytes: 6, color: PALETTE.ok },
  { label: "Src MAC", bytes: 6, color: PALETTE.ok },
  { label: "Type", bytes: 2, color: PALETTE.note },
  { label: "Data", bytes: 12, color: PALETTE.chalk },
  { label: "FCS", bytes: 4, color: PALETTE.control },
];
const BITS = "0100100001001001".split("");
const FLIP = 6;

const CARD_W = 480;
const CARD_H = 250;
const CELL = 12;
const COLS = Math.ceil(CARD_W / CELL);
const ROWS = Math.ceil(CARD_H / CELL);
// The demo's band shape.
const SPREAD_ABOVE = 0.25;
const SPREAD_BELOW = 0.25;
const SCATTER = 0.15;
const CORE = 0.025;
const MIN_SCATTER = 0.3;
const THRESHOLD = 0.65;
const TRAVEL = 1 + SPREAD_ABOVE + SPREAD_BELOW;
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%&*+=?!<>{}[]";

const hash = (r: number, c: number, seed: number) => {
  const raw = Math.sin(r * seed + c * (seed * 2.45)) * 43758.5453;
  return raw - Math.floor(raw);
};
const CELLS = Array.from({ length: ROWS * COLS }, (_, i) => {
  const r = Math.floor(i / COLS);
  const c = i % COLS;
  return {
    y: (r + 0.5) / ROWS,
    vis: hash(r, c, 127.1),
    scatter: (hash(r, c, 269.3) - 0.5) * SCATTER,
    ch: CHARS[Math.floor(hash(r, c, 71.7) * CHARS.length)],
  };
});

export function CatchError({
  active,
  progress,
  reduce,
}: {
  active: number;
  progress: MotionValue<number>;
  reduce: boolean;
}) {
  const wipeStart = STEP_AT(3, N) + 0.01;
  const wipeEnd = 0.95;
  const t = useTransform(progress, (p) =>
    reduce ? 1 : Math.min(Math.max((p - wipeStart) / (wipeEnd - wipeStart), 0), 1),
  );
  const clip = useTransform(t, (v) => {
    const pct = Math.min(Math.max((-SPREAD_ABOVE + v * TRAVEL) * 100, 0), 100);
    return `polygon(0% ${pct}%, 100% ${pct}%, 100% 100%, 0% 100%)`;
  });

  // The dissolve band — cells toggled directly, never re-rendered.
  const grid = useRef<HTMLDivElement | null>(null);
  const paint = (v: number) => {
    const el = grid.current;
    if (!el) return;
    const kids = el.children as HTMLCollectionOf<HTMLElement>;
    if (v <= 0 || v >= 1) {
      for (let i = 0; i < kids.length; i++) kids[i].style.visibility = "hidden";
      return;
    }
    const band = -SPREAD_ABOVE + v * TRAVEL;
    for (let i = 0; i < CELLS.length; i++) {
      const cell = CELLS[i];
      const raw = Math.abs(cell.y - band);
      const strength = Math.min(Math.max(raw / CORE, MIN_SCATTER), 1);
      const d = cell.y - band + cell.scatter * strength;
      const nd = d >= 0 ? d / SPREAD_BELOW : Math.abs(d) / SPREAD_ABOVE;
      const on = nd < 1 && (1 - nd) * (1 - nd) > cell.vis * THRESHOLD;
      kids[i].style.visibility = on ? "visible" : "hidden";
    }
  };
  useMotionValueEvent(t, "change", paint);
  useEffect(() => paint(t.get()));

  const sent = active >= 1;
  const flipped = active >= 2;

  return (
    <div className="relative" style={{ width: CARD_W, height: CARD_H }}>
      {/* underneath: the clean retransmission */}
      <FrameCard
        title="Retransmitted frame"
        badge={{ text: "CRC ✓ · ACK sent", color: PALETTE.ok }}
        sent
        flip={-1}
        border={PALETTE.ok}
      />
      {/* on top: the frame that gets hit */}
      <motion.div className="absolute inset-0" style={{ clipPath: clip }}>
        <FrameCard
          title={flipped ? "Received frame" : "Outgoing frame"}
          badge={
            flipped
              ? { text: "CRC ✗ · mismatch", color: PALETTE.fail }
              : { text: sent ? "on the wire" : "38 bytes", color: PALETTE.data }
          }
          sent={sent}
          flip={flipped ? FLIP : -1}
          border={flipped ? PALETTE.fail : PALETTE.data}
          building={active === 0}
        />
      </motion.div>
      {/* the dissolve band */}
      <div ref={grid} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
        {CELLS.map((c, i) => (
          <span
            key={i}
            className="absolute flex items-center justify-center font-mono font-bold"
            style={{
              left: (i % COLS) * CELL,
              top: Math.floor(i / COLS) * CELL,
              width: CELL,
              height: CELL,
              fontSize: CELL * 0.75,
              color: PALETTE.fail,
              visibility: "hidden",
            }}
          >
            {c.ch}
          </span>
        ))}
      </div>
    </div>
  );
}

function FrameCard({
  title,
  badge,
  sent,
  flip,
  border,
  building,
}: {
  title: string;
  badge: { text: string; color: string };
  sent: boolean;
  flip: number;
  border: string;
  building?: boolean;
}) {
  return (
    <div
      className="absolute inset-0 flex flex-col gap-4 rounded-xl border-2 bg-surface-container p-5"
      style={{ borderColor: border }}
    >
      <div className="flex items-center justify-between">
        <span className="font-hand text-[22px] font-bold text-on-surface">{title}</span>
        <span
          className="rounded-md px-2 py-0.5 font-mono text-[12px] font-bold"
          style={{ color: badge.color, background: `${badge.color}22` }}
        >
          {badge.text}
        </span>
      </div>
      <div className="flex h-14 w-full overflow-hidden rounded-lg">
        {FIELDS.map((f, i) => (
          <motion.div
            key={f.label}
            className="flex flex-col items-center justify-center border-2 border-l-0 first:border-l-2"
            style={{ flexGrow: f.bytes, flexBasis: 0, minWidth: 48, borderColor: f.color, background: `${f.color}1f` }}
            initial={building ? { opacity: 0, y: -14 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 24 }}
          >
            <span className="font-mono text-[12px] font-bold" style={{ color: f.color }}>
              {f.label}
            </span>
            <span className="font-mono text-[11px] text-on-surface-variant">{f.bytes} B</span>
          </motion.div>
        ))}
      </div>
      <div
        className="relative flex h-10 items-center gap-[3px] overflow-hidden rounded-full border px-3"
        style={{ borderColor: sent ? PALETTE.data : "var(--line)" }}
      >
        {sent &&
          BITS.map((b, i) => {
            const bad = i === flip;
            return (
              <motion.span
                key={i}
                className="flex h-7 w-[16px] items-center justify-center rounded-[3px] font-mono text-[14px] font-bold"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0, scale: bad ? 1.3 : 1 }}
                transition={{ delay: i * 0.03 }}
                style={{
                  color: bad ? PALETTE.fail : PALETTE.data,
                  background: bad ? `${PALETTE.fail}33` : "transparent",
                }}
              >
                {bad ? (b === "1" ? "0" : "1") : b}
              </motion.span>
            );
          })}
        {flip >= 0 && (
          <span className="ml-auto font-mono text-[14px]" style={{ color: PALETTE.fail }}>
            ⚡ bit {flip}
          </span>
        )}
        {!sent && <span className="font-sans text-[13px] text-on-surface-variant">waiting to send…</span>}
      </div>
    </div>
  );
}
