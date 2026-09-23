"use client";

// Unit 4 — Data Link & error control. One Ethernet frame's bad day:
//   1. the frame is built, field by field
//   2. its bits go out on the wire
//   3. noise flips one bit in transit
//   4. the receiver's CRC doesn't match → drop, retransmit, ACK
// The receiver's verdict is the lesson: a checksum can't fix a frame, but it
// can refuse one, and the retransmission is what makes the link reliable.

import { AnimatePresence, motion } from "framer-motion";
import { PALETTE } from "@/lib/palette";
import type { ShowStep } from "./ScrollShowcase";

export const ERROR_STEPS: ShowStep[] = [
  {
    tag: "frame",
    title: "Build the frame",
    detail: "The data link layer wraps the packet: who it's for, who sent it, what's inside, and a 4-byte CRC computed over all of it.",
  },
  {
    tag: "bits",
    title: "Send the bits",
    detail: "The frame leaves as a stream of bits. The wire has no idea where one field ends and the next begins.",
  },
  {
    tag: "flip",
    title: "Noise strikes",
    detail: "Interference flips a single bit — a 1 arrives as a 0. Nobody on the wire can tell anything went wrong.",
  },
  {
    tag: "CRC ✗",
    title: "Catch it, resend it",
    detail: "The receiver recomputes the CRC and it doesn't match the FCS, so the frame is dropped. No ACK comes back, the sender retransmits, and the clean copy is ACKed.",
  },
];

const FIELDS = [
  { id: "pre", label: "Preamble", bytes: 8, color: PALETTE.muted },
  { id: "dst", label: "Dst MAC", bytes: 6, color: PALETTE.ok },
  { id: "src", label: "Src MAC", bytes: 6, color: PALETTE.ok },
  { id: "type", label: "Type", bytes: 2, color: PALETTE.note },
  { id: "data", label: "Data", bytes: 12, color: PALETTE.chalk },
  { id: "fcs", label: "FCS", bytes: 4, color: PALETTE.control },
];
const BITS = "0100100001001001".split("");
const FLIP = 6;

export function CatchError({ active }: { active: number }) {
  const onWire = active >= 1;
  const flipped = active >= 2;

  return (
    <div className="flex w-[480px] flex-col gap-7">
      {/* the frame */}
      <div className="flex h-16 w-full overflow-hidden rounded-lg">
        {FIELDS.map((f, i) => (
          <motion.div
            key={f.id}
            className="flex flex-col items-center justify-center border-2 border-l-0 first:border-l-2"
            style={{ flexGrow: f.bytes, flexBasis: 0, minWidth: 48, borderColor: f.color, background: `${f.color}1f` }}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: active === 0 ? i * 0.08 : 0, type: "spring", stiffness: 300, damping: 24 }}
          >
            <span className="font-mono text-[12px] font-bold" style={{ color: f.color }}>
              {f.label}
            </span>
            <span className="font-mono text-[11px] text-on-surface-variant">{f.bytes} B</span>
          </motion.div>
        ))}
      </div>

      {/* sender · wire · receiver */}
      <div className="relative flex items-center justify-between">
        <Endpoint label="Sender" />
        <div className="relative mx-3 h-12 flex-1 overflow-hidden rounded-full border" style={{ borderColor: onWire ? PALETTE.data : "var(--line)" }}>
          {onWire && (
            <motion.div
              key={active === 3 ? "resend" : "send"}
              className="absolute inset-y-0 flex items-center gap-[3px] px-3"
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            >
              {BITS.map((b, i) => {
                const bad = flipped && active !== 3 && i === FLIP;
                return (
                  <motion.span
                    key={i}
                    className="flex h-7 w-[14px] items-center justify-center rounded-[3px] font-mono text-[13px] font-bold"
                    animate={{
                      color: bad ? PALETTE.fail : PALETTE.data,
                      backgroundColor: bad ? `${PALETTE.fail}33` : "transparent",
                      scale: bad ? 1.25 : 1,
                    }}
                  >
                    {bad ? (b === "1" ? "0" : "1") : b}
                  </motion.span>
                );
              })}
            </motion.div>
          )}
          {flipped && active === 2 && (
            <motion.span
              className="absolute right-[38%] top-0 font-mono text-[18px]"
              style={{ color: PALETTE.fail }}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: -2, opacity: 1 }}
            >
              ⚡
            </motion.span>
          )}
        </div>
        <Endpoint label="Receiver" />
      </div>

      {/* the verdict */}
      <div className="flex min-h-[110px] flex-col items-center gap-2">
        <AnimatePresence mode="wait">
          {active === 3 ? (
            <motion.div
              key="verdict"
              className="flex w-full flex-col gap-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Row tone={PALETTE.fail} left="CRC computed 0x1F02A8C4" right="FCS says 0x5A3C19E7" verdict="✗ drop" />
              <Row tone={PALETTE.control} left="no ACK… timer expires" right="sender retransmits" verdict="↻" delay={0.5} />
              <Row tone={PALETTE.ok} left="CRC computed 0x5A3C19E7" right="matches FCS" verdict="✓ ACK" delay={1} />
            </motion.div>
          ) : (
            <motion.p
              key={`hint-${active}`}
              className="pt-6 text-center font-sans text-[14px] text-on-surface-variant"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {active === 0 ? "38 bytes, ready to go" : active === 1 ? "bits in flight…" : "the receiver hasn't noticed — yet"}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Endpoint({ label }: { label: string }) {
  return (
    <div className="flex w-20 flex-col items-center gap-1">
      <span className="h-10 w-14 rounded-md border-2 border-outline bg-surface-container" />
      <span className="font-label-caps text-[11px] uppercase text-on-surface-variant">{label}</span>
    </div>
  );
}

function Row({ tone, left, right, verdict, delay = 0 }: { tone: string; left: string; right: string; verdict: string; delay?: number }) {
  return (
    <motion.div
      className="flex items-center gap-3 rounded-md px-3 py-1.5 font-mono text-[13px]"
      style={{ background: `${tone}1a` }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
    >
      <span className="text-on-surface">{left}</span>
      <span className="text-on-surface-variant">·</span>
      <span className="text-on-surface-variant">{right}</span>
      <span className="ml-auto font-bold" style={{ color: tone }}>
        {verdict}
      </span>
    </motion.div>
  );
}
