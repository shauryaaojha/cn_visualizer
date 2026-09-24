"use client";

// Predict mode: before a frame is revealed, commit to what it will show.
//
// Answering first and seeing the explanation second is the whole point — the
// guess is what makes the reveal stick. Keys 1–4 answer, Enter reveals, so a
// student can run a whole lesson without touching the mouse.

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Prediction } from "@/types/visualization";

interface PredictCardProps {
  /** The question for the pending frame, or null when nothing is pending. */
  prediction: Prediction | null;
  /** Frame index the question belongs to — resets the card between questions. */
  stepKey: number | null;
  onAnswer: (right: boolean) => void;
  onReveal: () => void;
}

export function PredictCard({ prediction, stepKey, onAnswer, onReveal }: PredictCardProps) {
  return (
    <AnimatePresence>
      {prediction && stepKey !== null && (
        <Card key={stepKey} p={prediction} onAnswer={onAnswer} onReveal={onReveal} />
      )}
    </AnimatePresence>
  );
}

function Card({ p, onAnswer, onReveal }: { p: Prediction; onAnswer: (right: boolean) => void; onReveal: () => void }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const answered = chosen !== null;

  const choose = (i: number) => {
    if (answered) return;
    setChosen(i);
    onAnswer(i === p.answer);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (!answered && n >= 1 && n <= p.options.length) {
        e.preventDefault();
        e.stopImmediatePropagation();
        choose(n - 1);
      } else if (answered && (e.key === "Enter" || e.key === "ArrowRight" || e.key === " ")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        onReveal();
      }
    };
    // Capture, so the lesson's own Space/→ bindings don't also fire.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  return (
    <motion.div
      className="absolute inset-0 z-20 flex items-end justify-center bg-surface/40 p-6 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        role="dialog"
        aria-label="Predict"
        className="w-full max-w-xl rounded-xl border border-note/60 bg-surface-container p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
        initial={{ y: 24, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 12, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
      >
        <p className="mb-1 flex items-center gap-1.5 font-label-caps text-label-caps uppercase text-note">
          <Icon name="help" className="text-[16px]" /> Predict
        </p>
        <h3 className="font-hand text-[26px] font-bold leading-snug text-on-surface">{p.question}</h3>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {p.options.map((o, i) => {
            const right = i === p.answer;
            const picked = i === chosen;
            const state = !answered
              ? "border-outline-variant hover:border-note hover:bg-note/10 text-on-surface"
              : right
                ? "border-mint bg-mint/15 text-mint"
                : picked
                  ? "border-coral bg-coral/15 text-coral"
                  : "border-outline-variant/50 text-on-surface-variant/60";
            return (
              <button
                key={o}
                type="button"
                onClick={() => choose(i)}
                disabled={answered}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left font-sans text-[15px] font-semibold transition-colors ${state}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-surface-container-highest font-mono text-[12px] text-on-surface-variant">
                  {answered && right ? "✓" : answered && picked ? "✗" : i + 1}
                </span>
                {o}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex min-h-[40px] items-center justify-between gap-4">
          <p className="font-sans text-[14px] leading-snug text-on-surface-variant">
            {!answered
              ? "Pick one — keys 1–" + p.options.length + " work too."
              : chosen === p.answer
                ? (p.why ?? "Right.")
                : `Not quite — it's "${p.options[p.answer]}". ${p.why ?? ""}`}
          </p>
          {answered && (
            <button
              type="button"
              autoFocus
              onClick={onReveal}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-4 py-2 font-sans text-[14px] font-bold text-surface transition-transform active:scale-[0.97]"
            >
              Show me <Icon name="east" className="text-[16px]" />
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
