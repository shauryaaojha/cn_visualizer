"use client";

// Right rail: the narrated steps so far, plus the algorithm with its live line
// lit. Shared by every engine — see PlayerControls for why one component works
// for all of them.

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { PseudocodeBlock } from "@/components/visualizer/PseudocodeBlock";
import type { PlayerSnapshot } from "@/lib/createPlayerStore";

export function PlayerNotes({ use, codeLabel = "ALGORITHM" }: { use: () => PlayerSnapshot; codeLabel?: string }) {
  const s = use();
  const activeRef = useRef<HTMLDivElement | null>(null);
  const program = s.program;
  const steps = program?.steps ?? [];

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [s.stepIndex]);

  const codeLines = steps[s.stepIndex]?.codeLines ?? [];

  return (
    <aside className="z-40 hidden h-full w-80 shrink-0 flex-col overflow-hidden border-l border-outline-variant bg-surface-container-low/80 backdrop-blur-xl lg:flex">
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant px-md py-3">
        <h3 className="flex items-center gap-2 font-label-caps text-label-caps text-primary">
          <Icon name="school" className="text-[16px]" /> Instructor Notes
        </h3>
        {program && (
          <span className="font-mono text-[11px] text-on-surface-variant/60">
            {s.stepIndex + 1}/{steps.length}
          </span>
        )}
      </div>

      {/* Narrated steps */}
      <div className="flex flex-col" style={{ flex: "0 0 55%", minHeight: 0 }}>
        <p className="shrink-0 px-md pb-1 pt-2 font-label-caps text-[10px] text-on-surface-variant/60">STEPS</p>
        <div className="scroll-thin flex-1 space-y-2 overflow-y-auto px-md pb-2">
          {!program && (
            <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant/60">
              Press <span className="text-primary">Run</span> — each step will be narrated here.
            </p>
          )}
          {program &&
            steps.slice(0, s.stepIndex + 1).map((st, i) => {
              const isCurrent = i === s.stepIndex;
              return (
                <div
                  key={i}
                  ref={isCurrent ? activeRef : undefined}
                  className={`relative border p-sm transition-all ${
                    isCurrent
                      ? "border-primary bg-surface-container text-primary shadow-[0_0_10px_rgba(34,211,238,0.12)]"
                      : "border-outline-variant bg-surface-container text-on-surface-variant opacity-70"
                  }`}
                >
                  <span
                    className={`absolute -left-1 top-2 h-2 w-2 ${isCurrent ? "bg-primary" : "bg-surface-variant"}`}
                  />
                  <p className="font-code-snippet text-code-snippet leading-relaxed">
                    <span className={isCurrent ? "font-bold" : "text-primary/70"}>Step {i + 1}:</span>{" "}
                    {st.description}
                  </p>
                </div>
              );
            })}
        </div>
      </div>

      {/* Algorithm */}
      <div className="flex flex-col border-t border-outline-variant" style={{ flex: "1 1 0", minHeight: 0 }}>
        <div className="flex shrink-0 items-center gap-2 px-md pb-1 pt-3">
          <Icon name="code" className="text-[14px] text-on-surface-variant" />
          <p className="truncate font-label-caps text-[10px] text-on-surface-variant">
            {program ? program.title : codeLabel}
          </p>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-md pb-md">
          {!program ? (
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant/60">
              The algorithm appears once you run an operation.
            </p>
          ) : (
            <PseudocodeBlock pseudocode={program.pseudocode} activeLines={codeLines} />
          )}
        </div>
      </div>
    </aside>
  );
}
