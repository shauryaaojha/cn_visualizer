"use client";

// Under the stage: the narration, then the timeline you drive it with.
//
// The caption is the teacher's voice, so it is big and it is right under the
// animation — the eye drops one inch, not across the screen. Each new caption
// arrives word by word (a short stagger, ~0.4s total) so the change of step
// is noticed without anything flashing.
//
// The timeline is every frame of the lesson as a stop you can click. Stops
// carry the engine's own labels ("L4 ↓", "wire", "FCS ✓") so the shape of the
// lesson is visible before you play it.
//
// Hand-rolled: the Animmaster text animations are either cursor-displacement
// (Text Animations/16 — fights reading) or logo morphs, neither of which suits
// a narration line.

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { SPEED_STOPS, type PlayerSnapshot } from "@/lib/createPlayerStore";
import { useLessonUi } from "@/lib/lessonUiStore";

const TONE: Record<string, string> = {
  ok: "bg-mint/15 text-mint",
  error: "bg-coral/15 text-coral",
  warn: "bg-amber/15 text-amber",
  info: "bg-note/15 text-note",
};

export function TimelineDock({ use }: { use: () => PlayerSnapshot }) {
  const s = use();
  const reduce = useReducedMotion();
  const predict = useLessonUi((u) => u.predict);
  const [hover, setHover] = useState<number | null>(null);
  const steps = s.program?.steps ?? [];
  const total = steps.length;
  const cur = steps[s.stepIndex];
  const peek = hover !== null ? steps[hover] : null;

  const cycleSpeed = () => {
    const i = SPEED_STOPS.indexOf(s.speed);
    s.setSpeed(SPEED_STOPS[(i + 1) % SPEED_STOPS.length]);
  };

  return (
    <div className="shrink-0 border-t border-outline-variant bg-surface-container-low/80 backdrop-blur-md">
      {/* narration */}
      <div className="flex min-h-[84px] flex-wrap items-start gap-x-3 gap-y-1 px-5 pb-2 pt-3" aria-live="polite">
        {cur?.message && (
          <span
            className={`mt-0.5 shrink-0 rounded-md px-2 py-1 font-sans text-[13px] font-bold ${TONE[cur.message.tone]}`}
          >
            {cur.message.text}
          </span>
        )}
        <p className="max-w-5xl font-sans text-[16px] leading-[1.5] text-on-surface md:text-[18px]">
          {!cur ? (
            <span className="text-on-surface-variant">Press play, or click any stop on the timeline.</span>
          ) : (
            // Keyed on the step, so every new caption remounts and its words
            // stagger in. No exit animation: waiting on one let rapid key
            // presses leave an old caption on screen.
            <span key={s.stepIndex} className="inline">
              {cur.description.split(" ").map((w, i) => (
                <motion.span
                  key={i}
                  className="inline-block whitespace-pre"
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: reduce ? 0 : Math.min(i * 0.012, 0.35), ease: [0.23, 1, 0.32, 1] }}
                >
                  {w + " "}
                </motion.span>
              ))}
            </span>
          )}
        </p>
      </div>

      {/* transport + timeline */}
      <div className="flex items-center gap-3 px-4 pb-3">
        <div className="flex shrink-0 items-center gap-1">
          <RoundBtn label="Previous step (←)" icon="skip_previous" onClick={s.stepBack} disabled={!total} />
          <button
            type="button"
            onClick={s.togglePlay}
            disabled={!total}
            aria-label={s.isPlaying ? "Pause (Space)" : "Play (Space)"}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-surface transition-transform duration-150 hover:scale-105 active:scale-95 disabled:opacity-40"
          >
            <Icon name={s.isPlaying ? "pause" : "play_arrow"} className="text-[26px]" filled />
          </button>
          <RoundBtn label="Next step (→)" icon="skip_next" onClick={s.stepForward} disabled={!total} />
        </div>

        {/* the timeline */}
        <div className="relative min-w-0 flex-1" onMouseLeave={() => setHover(null)}>
          {peek && hover !== null && (
            <div
              className="pointer-events-none absolute bottom-full z-10 mb-2 w-72 -translate-x-1/2 rounded-md border border-outline-variant bg-surface-container-high px-3 py-2 shadow-lg"
              style={{ left: `clamp(9rem, ${((hover + 0.5) / total) * 100}%, calc(100% - 9rem))` }}
            >
              <p className="font-mono text-[12px] text-primary">
                Step {hover + 1}
                {peek.label ? ` · ${peek.label}` : ""}
              </p>
              <p className="mt-0.5 line-clamp-2 font-sans text-[13px] text-on-surface-variant">{peek.description}</p>
            </div>
          )}
          <div className="flex h-11 items-stretch" role="group" aria-label="Lesson timeline">
            {steps.map((st, i) => {
              const done = i < s.stepIndex;
              const here = i === s.stepIndex;
              const queued = s.pending === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => s.seek(i)}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  aria-label={`Step ${i + 1}${st.label ? `, ${st.label}` : ""}`}
                  aria-current={here ? "step" : undefined}
                  className="group relative flex min-w-[6px] flex-1 flex-col items-center justify-end gap-1 px-[1px]"
                >
                  {st.label && total <= 32 && (
                    <span
                      className={`hidden truncate font-mono text-[11px] leading-none transition-colors md:block ${
                        here ? "text-primary" : done ? "text-on-surface-variant" : "text-on-surface-variant/55"
                      }`}
                    >
                      {st.label}
                    </span>
                  )}
                  <span
                    className={`h-2 w-full rounded-full transition-colors duration-200 ${
                      here
                        ? "bg-primary shadow-[0_0_10px_rgba(240,210,100,0.6)]"
                        : done
                          ? "bg-primary/55"
                          : queued
                            ? "bg-note"
                            : "bg-surface-container-highest group-hover:bg-on-surface/40"
                    }`}
                  />
                  {predict && st.predict && (
                    <span className="absolute -top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-note" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={cycleSpeed}
            title="Playback speed"
            className="flex h-9 items-center gap-1 rounded-md border border-outline-variant px-2 font-mono text-[13px] text-on-surface-variant transition-colors hover:border-primary/70 hover:text-on-surface"
          >
            <Icon name="speed" className="text-[16px]" />
            {s.speed}×
          </button>
          <span className="w-14 text-right font-mono text-[13px] text-on-surface-variant">
            {total ? `${s.stepIndex + 1}/${total}` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

function RoundBtn({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-40"
    >
      <Icon name={icon} className="text-[22px]" />
    </button>
  );
}
