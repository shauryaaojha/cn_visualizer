"use client";

// Shared chrome for every leaf — the lesson studio.
//
//   ┌ header: title · sibling topics · Predict · prev/next · Inspector · Record ┐
//   │                                                   │                     │
//   │                    STAGE                          │     INSPECTOR       │
//   │          (the animation, as big as it gets)       │  what you clicked,  │
//   │                                                   │  numbers, algorithm │
//   ├── narration ─────────────────────────────────────┤  and the log        │
//   └── ⏮ ▶ ⏭  ━━●━━ timeline with labelled stops ━━ 1× ┘                     ┘
//
// The inputs that used to be a permanent left column live in a Setup drawer:
// you set an experiment up once, then watch it, so they should not cost the
// stage 288px the whole time.
//
// Record mode is unchanged — RecordShell, same store, same place in the run.

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { BoardBackground } from "@/components/layout/BoardBackground";
import { Navbar } from "@/components/layout/Navbar";
import { Icon } from "@/components/ui/Icon";
import { Inspector } from "@/components/visualizer/lesson/Inspector";
import { LessonHeader } from "@/components/visualizer/lesson/LessonHeader";
import { PredictCard } from "@/components/visualizer/lesson/PredictCard";
import { TimelineDock } from "@/components/visualizer/lesson/TimelineDock";
import { RecordShell } from "@/components/visualizer/RecordShell";
import type { PlayerSnapshot } from "@/lib/createPlayerStore";
import { useLessonUi } from "@/lib/lessonUiStore";
import { useRecordStore } from "@/lib/recordStore";
import { useLessonKeys } from "@/lib/useLessonKeys";

interface LessonShellProps {
  path: string;
  title: string;
  blurb: string;
  canvas: ReactNode;
  sidebar: ReactNode;
  /** The engine's store hook — drives the transport, the note and the keys. */
  use: () => PlayerSnapshot;
  /** A nudge shown in the Inspector before anything is clicked. */
  hint?: string;
}

export function LessonShell({ path, title, blurb, canvas, sidebar, use, hint }: LessonShellProps) {
  const s = use();
  const recording = useRecordStore((st) => st.on);
  const initFromUrl = useRecordStore((st) => st.initFromUrl);
  const { predict, setupOpen, setSetupOpen, inspectorOpen, setInspectorOpen, select, recordAnswer, resetScore } =
    useLessonUi();

  // ?record=1 is read client-side: a static export cannot touch search params
  // during prerender without a Suspense boundary, and this is simpler.
  useEffect(() => initFromUrl(), [initFromUrl]);

  // A fresh page starts with nothing selected, and on a narrow screen the
  // Inspector starts closed so it does not sit on top of the stage.
  useEffect(() => {
    select(null);
    if (window.innerWidth < 1024) setInspectorOpen(false);
  }, [path, select, setInspectorOpen]);

  useLessonKeys(s);

  // --- Predict mode: gate forward motion on unanswered questions ---
  const answered = useRef(new Set<number>());
  const { program, setGate, pending, release } = s;
  useEffect(() => {
    answered.current = new Set();
    resetScore();
  }, [program, resetScore]);
  useEffect(() => {
    if (!predict || recording || !program) {
      setGate(null);
      return;
    }
    setGate((i) => !program.steps[i]?.predict || answered.current.has(i));
    return () => setGate(null);
  }, [predict, recording, program, setGate]);

  const pendingPrediction = predict && pending !== null ? (program?.steps[pending]?.predict ?? null) : null;

  if (recording) {
    return (
      <>
        <BoardBackground />
        <RecordShell title={title} canvas={canvas} use={use} />
      </>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <BoardBackground />
      <Navbar />

      <div className="mt-16 flex min-h-0 flex-1 flex-col">
        <LessonHeader title={title} hasSetup={!!sidebar} />

        <div className="relative flex min-h-0 flex-1">
          <main className="flex min-w-0 flex-1 flex-col">
            {/* min-h-0 is what lets FitStage measure the leftover space correctly. */}
            <div className="relative min-h-0 flex-1">
              {canvas}
              <PredictCard
                prediction={pendingPrediction}
                stepKey={pending}
                onAnswer={(right) => {
                  if (pending !== null) answered.current.add(pending);
                  recordAnswer(right);
                }}
                onReveal={release}
              />
            </div>
            <TimelineDock use={use} />
          </main>

          <AnimatePresence initial={false}>
            {inspectorOpen && (
              <motion.aside
                key="inspector"
                aria-label="Inspector"
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 40, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="absolute inset-y-0 right-0 z-30 w-[min(360px,92vw)] border-l border-outline-variant bg-surface-container-low/95 backdrop-blur-xl lg:static lg:z-auto lg:w-[340px] lg:shrink-0 lg:bg-surface-container-low/60"
              >
                <Inspector use={use} blurb={blurb} hint={hint} />
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Setup drawer */}
      <AnimatePresence>
        {setupOpen && (
          <>
            <motion.button
              key="scrim"
              type="button"
              aria-label="Close setup"
              className="fixed inset-0 z-[70] bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSetupOpen(false)}
            />
            <SetupDrawer onClose={() => setSetupOpen(false)}>{sidebar}</SetupDrawer>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SetupDrawer({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      key="drawer"
      role="dialog"
      aria-label="Setup"
      className="fixed bottom-0 left-0 top-16 z-[80] flex w-[min(320px,92vw)] flex-col border-r border-outline-variant bg-surface-container-low shadow-[24px_0_60px_rgba(0,0,0,0.3)]"
      initial={{ x: "-100%" }}
      animate={{ x: 0 }}
      exit={{ x: "-100%" }}
      transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-outline-variant px-4">
        <span className="flex items-center gap-2 font-label-caps text-label-caps uppercase text-on-surface-variant">
          <Icon name="tune" className="text-[16px]" /> Setup
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close setup"
          className="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
        >
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>
      <div className="min-h-0 flex-1 [&>aside]:w-full [&>aside]:border-r-0 [&>aside]:bg-transparent">{children}</div>
    </motion.div>
  );
}
