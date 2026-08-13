"use client";

// Navbar + collapsible left rail + content column.
//
// The bottom transport bar used to be a fixed footer owned by this shell. It
// isn't any more: controls and narration belong directly under the animation
// (see LessonShell), so everything below the navbar is one flex row and the
// content column owns its own vertical stacking.

import { useState, type ReactNode } from "react";
import { BoardBackground } from "@/components/layout/BoardBackground";
import { Navbar } from "@/components/layout/Navbar";
import { Icon } from "@/components/ui/Icon";

interface AppShellProps {
  children: ReactNode;
  /** Left control rail — where you set up the experiment. */
  sidebar: ReactNode;
}

export function AppShell({ children, sidebar }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(true);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <BoardBackground />
      <Navbar />

      <div className="mt-16 flex h-[calc(100dvh-64px)] w-full overflow-hidden">
        {/* Control rail: collapsible column on md+, slide-in drawer on mobile */}
        <div
          className={`fixed bottom-0 left-0 top-16 z-50 flex transition-transform duration-300 ease-out md:static md:top-0 md:z-auto md:translate-x-0 md:overflow-hidden md:transition-[width] ${
            drawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } ${railOpen ? "md:w-72" : "md:w-0"}`}
        >
          {sidebar}
        </div>

        <button
          onClick={() => setRailOpen((v) => !v)}
          title={railOpen ? "Hide controls" : "Show controls"}
          aria-label={railOpen ? "Hide controls" : "Show controls"}
          className="z-40 hidden w-4 shrink-0 items-center justify-center border-r-[1.5px] border-dashed border-outline-variant bg-surface-container-low/50 text-on-surface-variant/60 backdrop-blur-sm transition-colors hover:bg-surface-container hover:text-primary md:flex"
        >
          <Icon name={railOpen ? "chevron_left" : "chevron_right"} className="text-[16px]" />
        </button>

        {drawerOpen && (
          <button
            aria-label="Close controls"
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 top-16 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          />
        )}

        {children}
      </div>

      <button
        onClick={() => setDrawerOpen((v) => !v)}
        aria-label="Toggle controls"
        className="fixed bottom-4 right-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-primary bg-primary text-surface shadow-lg transition-transform active:scale-95 md:hidden"
      >
        <Icon name={drawerOpen ? "close" : "tune"} className="text-[22px]" />
      </button>
    </div>
  );
}
