"use client";

// Unit 2 — Addressing. One IPv4 address, carved step by step:
//   1. the address as 32 bits
//   2. a /24 mask splits network from host
//   3. borrow 2 bits → four /26 subnets
//   4. VLSM — give each department only what it needs, largest first
// Top: the 32 bits with the prefix boundary sliding. Bottom: the /24's 256
// addresses as one bar that splits exactly where the maths says.

import { motion } from "framer-motion";
import { PALETTE } from "@/lib/palette";
import type { ShowStep } from "./ScrollShowcase";

export const CARVE_STEPS: ShowStep[] = [
  {
    tag: "32 bits",
    title: "Read the address",
    detail: "192.168.1.37 is really 32 bits — four octets of 8. Every rule in this unit is about where you draw a line through them.",
  },
  {
    tag: "/24",
    title: "Apply the mask",
    detail: "A /24 mask says the first 24 bits name the network and the last 8 name the host: 256 addresses, 254 usable.",
  },
  {
    tag: "/26",
    title: "Borrow bits",
    detail: "Borrow 2 host bits and the /24 splits into four /26 subnets of 64 — at .0, .64, .128 and .192.",
  },
  {
    tag: "VLSM",
    title: "Size to fit",
    detail: "VLSM gives each department only what it needs, largest first: 100 hosts get a /25, 50 a /26, 20 a /27, 10 a /28.",
  },
];

const OCTETS = [192, 168, 1, 37];
const BITS = OCTETS.map((o) => o.toString(2).padStart(8, "0")).join("").split("");
const PREFIX = [0, 24, 26, 24];

const BAR_W = 440;
type Seg = { from: number; size: number; label: string; sub: string; color: string; free?: boolean };
const LAYOUTS: Seg[][] = [
  [{ from: 0, size: 256, label: "192.168.1.0 – .255", sub: "256 addresses", color: PALETTE.muted }],
  [{ from: 0, size: 256, label: "192.168.1.0/24", sub: "254 usable hosts", color: PALETTE.data }],
  [0, 64, 128, 192].map((f, i) => ({
    from: f,
    size: 64,
    label: `.${f}/26`,
    sub: "62 hosts",
    color: [PALETTE.data, PALETTE.note, PALETTE.ok, PALETTE.control][i],
  })),
  [
    { from: 0, size: 128, label: ".0/25", sub: "Sales · 100", color: PALETTE.data },
    { from: 128, size: 64, label: ".128/26", sub: "HR · 50", color: PALETTE.note },
    { from: 192, size: 32, label: ".192/27", sub: "Lab · 20", color: PALETTE.ok },
    { from: 224, size: 16, label: "/28", sub: "Ops 10", color: PALETTE.control },
    { from: 240, size: 16, label: "free", sub: "", color: PALETTE.muted, free: true },
  ],
];

export function CarveAddress({ active }: { active: number }) {
  const prefix = PREFIX[active];
  const segs = LAYOUTS[active];
  const spring = { type: "spring" as const, stiffness: 220, damping: 26 };

  return (
    <div className="flex w-[480px] flex-col gap-8">
      {/* dotted decimal */}
      <div className="flex items-baseline justify-center gap-1 font-mono text-[34px] font-bold text-on-surface">
        {OCTETS.join(".")}
        <motion.span
          className="text-[24px]"
          style={{ color: PALETTE.data }}
          animate={{ opacity: prefix ? 1 : 0 }}
        >
          /{prefix || 24}
        </motion.span>
      </div>

      {/* 32 bits with the boundary */}
      <div className="relative flex justify-center gap-[6px]">
        {[0, 1, 2, 3].map((o) => (
          <div key={o} className="flex gap-[2px]">
            {BITS.slice(o * 8, o * 8 + 8).map((b, j) => {
              const i = o * 8 + j;
              const net = prefix > 0 && i < prefix;
              const host = prefix > 0 && i >= prefix;
              return (
                <motion.span
                  key={i}
                  className="flex h-8 w-[12px] items-center justify-center rounded-[3px] font-mono text-[12px] font-bold"
                  animate={{
                    backgroundColor: net ? `${PALETTE.data}33` : host ? `${PALETTE.note}22` : "rgba(243,241,231,0.06)",
                    color: net ? PALETTE.data : host ? PALETTE.note : PALETTE.chalk,
                  }}
                  transition={{ duration: 0.35, delay: i * 0.008 }}
                >
                  {b}
                </motion.span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="-mt-5 flex justify-center gap-10 font-label-caps text-[11px] uppercase">
        <motion.span animate={{ opacity: prefix ? 1 : 0 }} style={{ color: PALETTE.data }}>
          network · {prefix || 24} bits
        </motion.span>
        <motion.span animate={{ opacity: prefix ? 1 : 0 }} style={{ color: PALETTE.note }}>
          host · {32 - (prefix || 24)} bits
        </motion.span>
      </div>

      {/* the /24 as a bar of 256 addresses */}
      <div>
        <div className="relative h-16" style={{ width: BAR_W, margin: "0 auto" }}>
          {segs.map((s) => (
            <motion.div
              key={`${active}-${s.from}`}
              className="absolute top-0 flex h-16 flex-col items-center justify-center overflow-hidden rounded-md border-2"
              initial={{ opacity: 0, scaleX: 0.6 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ ...spring, delay: (s.from / 256) * 0.35 }}
              style={{
                left: (s.from / 256) * BAR_W + 1,
                width: (s.size / 256) * BAR_W - 2,
                borderColor: s.color,
                background: s.free
                  ? `repeating-linear-gradient(135deg, ${s.color}22 0 5px, transparent 5px 10px)`
                  : `${s.color}22`,
              }}
            >
              <span className="max-w-full truncate px-1 font-mono text-[12px] font-bold" style={{ color: s.color }}>
                {s.label}
              </span>
              {s.sub && (
                <span className="max-w-full truncate px-1 font-sans text-[12px] text-on-surface-variant">{s.sub}</span>
              )}
            </motion.div>
          ))}
        </div>
        <div className="mx-auto mt-1 flex justify-between font-mono text-[11px] text-on-surface-variant" style={{ width: BAR_W }}>
          <span>.0</span>
          <span>.128</span>
          <span>.255</span>
        </div>
      </div>
    </div>
  );
}
