"use client";

import { useState, type ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ShaderBackground } from "@/components/layout/ShaderBackground";
import { Icon } from "@/components/ui/Icon";

interface AppShellProps {
  children: ReactNode;
  /** Left control rail. */
  sidebar: ReactNode;
  /** Bottom transport bar. */
  footer: ReactNode;
}

export function AppShell({ children, sidebar, footer }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(true);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <ShaderBackground />
      <Navbar />

      <div className="mt-16 flex h-[calc(100dvh-120px)] w-full flex-1 overflow-hidden">
        {/* Control rail: collapsible column on md+, slide-in drawer on mobile */}
        <div
          className={`fixed bottom-14 left-0 top-16 z-50 flex transition-transform duration-300 ease-out md:static md:bottom-0 md:top-0 md:z-auto md:translate-x-0 md:overflow-hidden md:transition-[width] ${
            drawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } ${railOpen ? "md:w-72" : "md:w-0"}`}
        >
          {sidebar}
        </div>

        <button
          onClick={() => setRailOpen((v) => !v)}
          title={railOpen ? "Hide controls" : "Show controls"}
          aria-label={railOpen ? "Hide controls" : "Show controls"}
          className="z-40 hidden w-4 shrink-0 items-center justify-center border-r border-outline-variant bg-surface-container-low/60 text-on-surface-variant/60 backdrop-blur-sm transition-colors hover:bg-surface-container hover:text-primary md:flex"
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

      {footer}

      <button
        onClick={() => setDrawerOpen((v) => !v)}
        aria-label="Toggle controls"
        className="fixed bottom-[4.5rem] right-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full border border-primary-container bg-primary-container text-surface shadow-lg transition-transform active:scale-95 md:hidden"
      >
        <Icon name={drawerOpen ? "close" : "tune"} className="text-[22px]" />
      </button>
    </div>
  );
}
