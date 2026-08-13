"use client";

// Right rail: the teacher talking you through it, plus the algorithm with its
// live line lit.
//
// The voice matters as much as the layout here. vis.html got this right — a
// 👨‍🏫 Teacher's Note in handwriting reads as somebody explaining, where a
// monospace "Instructor Notes" panel reads as log output. Narration is set in
// Kalam; anything the network itself says stays monospace.

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { PseudocodeBlock } from "@/components/visualizer/PseudocodeBlock";
import type { PlayerSnapshot } from "@/lib/createPlayerStore";

export function PlayerNotes({ use, codeLabel = "ALGORITHM" }: { use: () => PlayerSnapshot; codeLabel?: string }) {
  const s = use();
  const activeRef = useRef<HTMLDivElement | null>(null);
  const program = s.program;
  const steps = program?.steps ?? [];
  const current = steps[s.stepIndex];

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [s.stepIndex]);

  const codeLines = current?.codeLines ?? [];

  return (
    <aside className="z-40 hidden h-full w-80 shrink-0 flex-col overflow-hidden border-l-[1.5px] border-dashed border-outline-variant bg-surface-container-low/80 backdrop-blur-xl lg:flex">
      {/* The teacher's note for the current step — pinned, not scrolled away. */}
      <div className="shrink-0 border-b-[1.5px] border-dashed border-outline-variant p-md">
        <div className="chalk-edge flex items-start gap-2.5 rounded-lg border-note/60 bg-note/[0.07] p-2.5">
          <span className="text-[17px] leading-none">👨‍🏫</span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="font-label-caps text-[9px] uppercase tracking-[0.08em] text-note">
                Teacher&apos;s Note
              </span>
              {program && (
                <span className="shrink-0 font-mono text-[10px] text-on-surface-variant/60">
                  {s.stepIndex + 1}/{steps.length}
                </span>
              )}
            </div>
            <p className="font-body-sm text-body-sm leading-relaxed text-on-surface">
              {current?.description ?? "Press Play — I'll explain each step as it happens."}
            </p>
          </div>
        </div>
      </div>

      {/* Everything said so far. */}
      <div className="flex flex-col" style={{ flex: "0 0 45%", minHeight: 0 }}>
        <p className="shrink-0 px-md pb-1 pt-2.5 font-label-caps text-[9px] uppercase tracking-[0.08em] text-on-surface-variant/60">
          So far
        </p>
        <div className="scroll-thin flex-1 space-y-1.5 overflow-y-auto px-md pb-2">
          {!program && (
            <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant/70">
              Press <span className="text-primary">Run</span> to begin.
            </p>
          )}
          {program &&
            steps.slice(0, s.stepIndex + 1).map((st, i) => {
              const isCurrent = i === s.stepIndex;
              return (
                <div
                  key={i}
                  ref={isCurrent ? activeRef : undefined}
                  className={`rounded-md border-[1.5px] border-dashed p-2 transition-all ${
                    isCurrent
                      ? "border-primary/70 bg-primary/10"
                      : "border-outline-variant/50 opacity-60"
                  }`}
                >
                  <p className="font-body-sm text-[12.5px] leading-relaxed">
                    <span
                      className={`mr-1 font-mono text-[10px] ${isCurrent ? "text-primary" : "text-on-surface-variant/60"}`}
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
      </div>

      {/* The algorithm on the board. */}
      <div className="flex flex-col border-t-[1.5px] border-dashed border-outline-variant" style={{ flex: "1 1 0", minHeight: 0 }}>
        <div className="flex shrink-0 items-center gap-2 px-md pb-1 pt-2.5">
          <Icon name="draw" className="text-[14px] text-on-surface-variant" />
          <p className="truncate font-label-caps text-[9px] uppercase tracking-[0.08em] text-on-surface-variant">
            {program ? program.title : codeLabel}
          </p>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-md pb-md">
          {!program ? (
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant/70">
              The working appears once you run an operation.
            </p>
          ) : (
            <PseudocodeBlock pseudocode={program.pseudocode} activeLines={codeLines} />
          )}
        </div>
      </div>
    </aside>
  );
}
