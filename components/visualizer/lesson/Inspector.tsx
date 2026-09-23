"use client";

// The right-hand panel: whatever you clicked, then the numbers, the
// algorithm and the log.
//
// It is the replacement for the four bands that used to be stacked under the
// animation (transport, stat chips, tabs, pseudocode). Those competed with
// the stage for height; here they compete for nothing, and the top slot is
// reserved for the thing the student is curious about right now.

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { PseudocodeBlock } from "@/components/visualizer/PseudocodeBlock";
import type { PlayerSnapshot } from "@/lib/createPlayerStore";
import { useLessonUi } from "@/lib/lessonUiStore";

const TONE: Record<string, string> = {
  signal: "text-primary",
  amber: "text-amber",
  mint: "text-mint",
  coral: "text-coral",
};

export function Inspector({ use, blurb, hint }: { use: () => PlayerSnapshot; blurb: string; hint?: string }) {
  const s = use();
  const { selection, select } = useLessonUi();
  const program = s.program;
  const cur = program?.steps[s.stepIndex];
  const logRef = useRef<HTMLOListElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // A new selection is the thing you just asked about — bring it into view.
  useEffect(() => {
    if (selection) panelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [selection]);

  useEffect(() => {
    const el = logRef.current?.lastElementChild;
    el?.scrollIntoView({ block: "nearest" });
  }, [s.stepIndex]);

  return (
    <div ref={panelRef} className="scroll-thin flex h-full flex-col gap-3 overflow-y-auto p-4">
      <AnimatePresence mode="wait" initial={false}>
        {selection ? (
          <motion.section
            key={selection.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="rounded-lg border bg-surface-container p-4"
            style={{ borderColor: selection.color ?? "var(--line)" }}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="font-label-caps text-label-caps uppercase" style={{ color: selection.color }}>
                  {selection.kind}
                </p>
                <h2 className="font-hand text-[24px] font-bold leading-tight text-on-surface">{selection.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => select(null)}
                aria-label="Close"
                className="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              >
                <Icon name="close" className="text-[18px]" />
              </button>
            </div>
            <div className="font-sans text-[14px] leading-relaxed text-on-surface-variant">{selection.body}</div>
          </motion.section>
        ) : (
          <motion.section
            key="about"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-dashed border-outline-variant p-4"
          >
            <p className="font-sans text-[15px] leading-relaxed text-on-surface-variant">{blurb}</p>
            {hint && <p className="mt-2 font-sans text-[14px] font-semibold text-note">{hint}</p>}
          </motion.section>
        )}
      </AnimatePresence>

      {program && program.stats.length > 0 && (
        <Section title="This run" icon="functions">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            {program.stats.map((st) => (
              <div key={st.label} className="contents">
                <dt className="font-sans text-[14px] text-on-surface-variant">{st.label}</dt>
                <dd className={`text-right font-mono text-[14px] font-semibold ${TONE[st.tone ?? "signal"]}`}>
                  {st.value}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {program && program.pseudocode.length > 0 && (
        <Section title="Algorithm" icon="draw">
          <PseudocodeBlock
            pseudocode={program.pseudocode}
            activeLines={cur?.codeLines ?? []}
            fontSize={13}
            className="whitespace-pre-wrap"
          />
        </Section>
      )}

      {program && (
        <Section title="So far" icon="list" defaultOpen={false}>
          <ol ref={logRef} className="flex max-h-60 flex-col gap-1 overflow-y-auto">
            {program.steps.slice(0, s.stepIndex + 1).map((st, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => s.seek(i)}
                  className={`w-full rounded px-2 py-1 text-left font-sans text-[13px] leading-snug transition-colors hover:bg-surface-container-high ${
                    i === s.stepIndex ? "bg-primary/10 text-on-surface" : "text-on-surface-variant"
                  }`}
                >
                  <span className="mr-1.5 font-mono text-[12px] text-primary/80">{i + 1}</span>
                  {st.description}
                </button>
              </li>
            ))}
          </ol>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group rounded-lg bg-surface-container-low/70">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-on-surface [&::-webkit-details-marker]:hidden">
        <Icon name={icon} className="text-[16px]" />
        {title}
        <Icon name="chevron_right" className="ml-auto text-[18px] transition-transform group-open:rotate-90" />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}
