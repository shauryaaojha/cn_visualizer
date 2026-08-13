"use client";

// Shared chrome for every leaf visualizer page: app shell + header strip +
// canvas + notes rail + transport bar. Screens supply the four engine-specific
// pieces and nothing else.

import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopicHeader } from "@/components/visualizer/TopicHeader";

interface VisualizerShellProps {
  path: string;
  title: string;
  blurb: string;
  canvas: ReactNode;
  notes: ReactNode;
  sidebar: ReactNode;
  footer: ReactNode;
}

export function VisualizerShell({
  path,
  title,
  blurb,
  canvas,
  notes,
  sidebar,
  footer,
}: VisualizerShellProps) {
  return (
    <AppShell sidebar={sidebar} footer={footer}>
      <main className="relative flex flex-1 items-center justify-center overflow-hidden pt-16">
        <TopicHeader path={path} title={title} blurb={blurb} />
        {canvas}
      </main>
      {notes}
    </AppShell>
  );
}
