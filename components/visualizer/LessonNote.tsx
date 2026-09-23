"use client";

// The explanation, directly beneath the controls.
//
// This replaces the old right-hand rail. Three reasons it moved: the rail was
// `hidden lg:flex`, so the entire voice of the app vanished on a laptop; a
// third column squeezed the canvas; and reading order should be a straight line
// down from the animation, not a diagonal.
//
// Steps and pseudocode become tabs rather than permanently-visible panels,
// because on any given frame you want one of the three, not all of them.

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PseudocodeBlock } from "@/components/visualizer/PseudocodeBlock";
import type { PlayerSnapshot } from "@/lib/createPlayerStore";

type Tab = "note" | "steps" | "code";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "note", label: "Teacher's Note", icon: "record_voice_over" },
  { id: "steps", label: "So far", icon: "list" },
  { id: "code", label: "Algorithm", icon: "draw" },
];

export function LessonNote({ use }: { use: () => PlayerSnapshot }) {
  const s = use();
  const [tab, setTab] = useState<Tab>("note");
  const activeRef = useRef<HTMLDivElement | null>(null);
  const program = s.program;
  const steps = program?.steps ?? [];
  const current = steps[s.stepIndex];

  useEffect(() => {
    if (tab === "steps") activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [s.stepIndex, tab]);

  return (
    <div className="flex h-[188px] shrink-0 flex-col border-t border-outline-variant bg-surface-container-low/70 backdrop-blur-md sm:h-[172px]">
      {/* Tabs */}
      <div className="flex shrink-0 items-center gap-1 border-b border-outline-variant/60 px-3 pt-1.5">
        {TABS.map((t) => {
          const on = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-t-md border border-b-0 px-2.5 py-1 font-sans text-[14px] font-bold transition-colors ${
                on
                  ? "border-note/60 bg-note/[0.09] text-note"
                  : "border-transparent text-on-surface-variant/60 hover:text-on-surface"
              }`}
            >
              <Icon name={t.icon} className="text-[14px]" />
              <span className={t.id === "note" ? "" : "hidden sm:inline"}>{t.label}</span>
            </button>
          );
        })}
        {program && (
          <span className="ml-auto pb-1 font-mono text-[12px] text-on-surface-variant/55">
            step {s.stepIndex + 1} of {steps.length}
          </span>
        )}
      </div>

      {/* Panel */}
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-2.5">
        {!program ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant/70">
            Press <span className="text-primary">Play</span> — I&apos;ll explain each step as it happens.
          </p>
        ) : tab === "note" ? (
          <div className="flex items-start gap-3">
            <span className="shrink-0 text-[20px] leading-none">👨‍🏫</span>
            <p className="max-w-4xl font-body-md text-body-md leading-relaxed text-on-surface">
              {current?.description}
            </p>
          </div>
        ) : tab === "steps" ? (
          <div className="flex flex-col gap-1.5">
            {steps.slice(0, s.stepIndex + 1).map((st, i) => {
              const isCurrent = i === s.stepIndex;
              return (
                <div
                  key={i}
                  ref={isCurrent ? activeRef : undefined}
                  className={`rounded-md border px-2 py-1.5 transition-all ${
                    isCurrent ? "border-primary/70 bg-primary/10" : "border-outline-variant/50 opacity-60"
                  }`}
                >
                  <p className="font-body-sm text-[13px] leading-relaxed">
                    <span
                      className={`mr-1.5 font-mono text-[12px] ${isCurrent ? "text-primary" : "text-on-surface-variant/60"}`}
                    >
                      {i + 1}.
                    </span>
                    <span className={isCurrent ? "text-on-surface" : "text-on-surface-variant"}>
                      {st.description}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="max-w-3xl">
            <PseudocodeBlock pseudocode={program.pseudocode} activeLines={current?.codeLines ?? []} />
          </div>
        )}
      </div>
    </div>
  );
}
