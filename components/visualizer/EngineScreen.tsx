"use client";

// The screen for engines that describe their Setup inputs as data
// (engines/controls.ts): run the lesson's op with its starting inputs, and
// hand the lesson studio a generated sidebar. Each engine wraps this in a
// one-line screen that supplies its store and canvas.

import { useEffect, type ReactNode } from "react";
import { LessonShell } from "@/components/visualizer/LessonShell";
import { ParamSidebar } from "@/components/visualizer/ParamSidebar";
import type { ControlSet } from "@/engines/controls";
import type { PlayerState } from "@/lib/createPlayerStore";
import type { BaseStep } from "@/types/visualization";
import type { StoreApi, UseBoundStore } from "zustand";

interface Props<S extends BaseStep, P extends { op: string }> {
  path: string;
  title: string;
  blurb: string;
  op: P["op"];
  store: UseBoundStore<StoreApi<PlayerState<S, P>>>;
  canvas: ReactNode;
  controls: (op: P["op"], params: P) => ControlSet;
  /** Inputs this lesson starts from (a loss where the lesson needs one). */
  opDefaults?: Partial<P>;
  hint: string;
}

export function EngineScreen<S extends BaseStep, P extends { op: string }>({ path, title, blurb, op, store, canvas, controls, opDefaults, hint }: Props<S, P>) {
  useEffect(() => {
    store.getState().run({ ...opDefaults, op } as Partial<P>);
  }, [op, store, opDefaults]);
  const params = store((s) => s.params);
  const run = store((s) => s.run);

  return (
    <LessonShell
      path={path}
      title={title}
      blurb={blurb}
      canvas={canvas}
      sidebar={<ParamSidebar set={controls(op, params)} params={params as unknown as Record<string, unknown>} run={(patch) => run(patch as Partial<P>)} />}
      use={store}
      hint={hint}
    />
  );
}
