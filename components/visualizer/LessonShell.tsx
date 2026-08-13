"use client";

// Shared chrome for every leaf: sidebar on the left, and a single reading
// column on the right — header, animation, controls, explanation, top to
// bottom. Screens supply the canvas and their store; everything else is here.

import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LessonNote } from "@/components/visualizer/LessonNote";
import { PlayerControls } from "@/components/visualizer/PlayerControls";
import { TopicHeader } from "@/components/visualizer/TopicHeader";
import type { PlayerSnapshot } from "@/lib/createPlayerStore";

interface LessonShellProps {
  path: string;
  title: string;
  blurb: string;
  canvas: ReactNode;
  sidebar: ReactNode;
  /** The engine's store hook — drives the transport and the note. */
  use: () => PlayerSnapshot;
}

export function LessonShell({ path, title, blurb, canvas, sidebar, use }: LessonShellProps) {
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
