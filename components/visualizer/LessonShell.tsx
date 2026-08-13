"use client";

// Shared chrome for every leaf.
//
// Two layouts, one set of pieces. Studying gets the sidebar plus a single
// reading column — header, animation, controls, explanation, top to bottom.
// Recording gets RecordShell: just the animation, a caption and fading
// controls. Both are driven by the same store, so switching mid-session keeps
// your place in the animation.

import { useEffect, type ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { BoardBackground } from "@/components/layout/BoardBackground";
import { LessonNote } from "@/components/visualizer/LessonNote";
import { PlayerControls } from "@/components/visualizer/PlayerControls";
import { RecordShell } from "@/components/visualizer/RecordShell";
import { TopicHeader } from "@/components/visualizer/TopicHeader";
import type { PlayerSnapshot } from "@/lib/createPlayerStore";
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
}

export function LessonShell({ path, title, blurb, canvas, sidebar, use }: LessonShellProps) {
  const s = use();
  const recording = useRecordStore((st) => st.on);
  const initFromUrl = useRecordStore((st) => st.initFromUrl);

  // ?record=1 is read client-side: a static export cannot touch search params
  // during prerender without a Suspense boundary, and this is simpler.
  useEffect(() => initFromUrl(), [initFromUrl]);

  useLessonKeys(s);

  if (recording) {
    return (
      <>
        <BoardBackground />
        <RecordShell title={title} canvas={canvas} use={use} />
      </>
    );
  }

  return (
    <AppShell sidebar={sidebar}>
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopicHeader path={path} title={title} blurb={blurb} />
        {/* min-h-0 is what lets FitStage measure the leftover space correctly. */}
        <div className="relative min-h-0 flex-1">{canvas}</div>
        <PlayerControls use={use} />
        <LessonNote use={use} />
      </main>
    </AppShell>
  );
}
