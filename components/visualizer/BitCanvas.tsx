"use client";

// Rows of bits, arithmetic happening on them. Rows keep stable ids so a bit
// that changes between frames animates in place; `offset` indents a row so a
// CRC generator sits under the part of the dividend it is dividing.

import { AnimatePresence, motion } from "framer-motion";
import { FitStage } from "@/components/visualizer/FitStage";
import { factSelection } from "@/components/visualizer/lesson/FactBody";
import { bitCellFact } from "@/engines/bitFacts";
import { useBitStore } from "@/lib/bitStore";
import { useLessonUi } from "@/lib/lessonUiStore";
import { PALETTE } from "@/lib/palette";
import type { BitCell } from "@/types/visualization";

const CELL = 38;
const ROLE_COLOR: Record<BitCell["role"], string> = {
  data: PALETTE.data,
  check: PALETTE.protocol,
  gen: PALETTE.note,
  work: PALETTE.chalk,
  rem: PALETTE.control,
  pad: PALETTE.muted,
  sum: PALETTE.ok,
};
const GROUP_LABEL = { sender: "Sender", wire: "Wire", receiver: "Receiver", work: "Working" } as const;

export function BitCanvas() {
  const step = useBitStore((s) => s.currentStep());
  const toggleSelect = useLessonUi((s) => s.toggleSelect);
  const selected = useLessonUi((s) => s.selection?.key);
  if (!step) return null;
  const width = step.cols * (CELL + 4) + 280;

  return (
    <FitStage>
      <div className="flex flex-col items-center gap-4" style={{ width }}>
        <div className="flex w-full flex-col gap-3">
          <AnimatePresence initial={false}>
            {step.rows.map((row) => (
              <motion.div key={row.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-end gap-3">
                <div className="w-[150px] shrink-0 text-right">
                  {row.group && <p className="font-label-caps text-[12px] uppercase tracking-wider text-on-surface-variant/70">{GROUP_LABEL[row.group]}</p>}
                  <p className="font-hand text-[17px] font-bold text-on-surface">{row.label}</p>
                </div>
                <div className="flex gap-1" style={{ marginLeft: (row.offset ?? 0) * (CELL + 4) }}>
                  {row.cells.map((c, i) => {
                    const key = `bit-${row.id}-${i}`;
                    const color = c.state === "flip" || c.state === "bad" ? PALETTE.fail : c.state === "ok" ? PALETTE.ok : ROLE_COLOR[c.role];
                    const lit = c.state === "active" || c.state === "flip" || c.state === "bad" || c.state === "ok";
                    return (
                      <div key={i} className="flex flex-col items-center gap-0.5">
                        <span className="h-4 whitespace-nowrap font-mono text-[12px] leading-4 text-on-surface-variant/80">{c.tag ?? ""}</span>
                        <motion.button
                          type="button"
                          onClick={() => toggleSelect(factSelection(key, `${row.label} · bit ${i + 1}`, `A ${c.v}`, color, bitCellFact(row, i)))}
                          initial={false}
                          animate={{ opacity: c.state === "dim" ? 0.35 : 1, scale: c.state === "active" || c.state === "flip" ? 1.06 : 1 }}
                          className={`flex items-center justify-center rounded-md border-2 font-mono text-[20px] font-bold hover:brightness-125 ${selected === key ? "outline outline-2 outline-offset-2 outline-note" : ""}`}
                          style={{ width: CELL, height: CELL, color, borderColor: color, borderStyle: c.role === "pad" ? "dashed" : "solid", background: lit ? `${color}2e` : "transparent" }}
                        >
                          <motion.span key={c.v} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                            {c.v}
                          </motion.span>
                        </motion.button>
                      </div>
                    );
                  })}
                </div>
                {row.note && <span className="mb-2 whitespace-nowrap font-mono text-[14px] text-on-surface-variant">{row.note}</span>}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {step.message && (
            <motion.div
              key={step.message.text}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`rounded-full border-[1.5px] border-dashed px-4 py-1.5 font-hand text-[15px] font-bold ${
                step.message.tone === "error" ? "border-coral/70 bg-coral/10 text-coral" : step.message.tone === "ok" ? "border-mint/70 bg-mint/10 text-mint" : "border-amber/70 bg-amber/10 text-amber"
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
