// ---------------------------------------------------------------------------
// The player.
//
// DSA-VISUALISER copied this ~130-line zustand store once per data structure.
// Every engine here compiles to the same Program<Step> shape, so one factory
// serves all of them: pass a compile function and its default params, get a
// fully-wired play/pause/step/scrub store back.
// ---------------------------------------------------------------------------

import { create, type StoreApi, type UseBoundStore } from "zustand";
import type { BaseStep, Program } from "@/types/visualization";

export const SPEED_STOPS = [0.5, 1, 1.5, 2, 4];
const BASE_DELAY = 1600;

/**
 * The slice the shared TransportBar / NotesPanel need. Every concrete store
 * satisfies it structurally, which is what lets those two components be
 * written once instead of once per engine.
 */
export interface PlayerSnapshot {
  program: Program<BaseStep> | null;
  stepIndex: number;
  isPlaying: boolean;
  speed: number;
  togglePlay: () => void;
  pause: () => void;
  stepForward: () => void;
  stepBack: () => void;
  toStart: () => void;
  toEnd: () => void;
  setSpeed: (speed: number) => void;
}

export interface PlayerState<S extends BaseStep, P> extends PlayerSnapshot {
  params: P;
  program: Program<S> | null;
  currentStep: () => S | null;
  setParams: (p: Partial<P>) => void;
  /** Recompile with (optionally patched) params, reset to frame 0, autoplay. */
  run: (p?: Partial<P>) => void;
  play: () => void;
  pause: () => void;
}

export function createPlayerStore<S extends BaseStep, P extends object>(
  compile: (params: P) => Program<S>,
  initialParams: P,
): UseBoundStore<StoreApi<PlayerState<S, P>>> {
  return create<PlayerState<S, P>>((set, get) => {
    // Per-store, so two visualizers on one page would not fight over a timer.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const clearT = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    function scheduleTick() {
      clearT();
      const { isPlaying, program, speed } = get();
      if (!isPlaying || !program) return;
      timer = setTimeout(() => {
        const s = get();
        if (!s.program) return;
        if (s.stepIndex >= s.program.steps.length - 1) {
          set({ isPlaying: false });
          clearT();
          return;
        }
        set({ stepIndex: s.stepIndex + 1 });
        scheduleTick();
      }, BASE_DELAY / speed);
    }

    return {
      params: initialParams,
      program: null,
      stepIndex: 0,
      isPlaying: false,
      speed: 1,

      currentStep: () => {
        const { program, stepIndex } = get();
        if (!program) return null;
        return program.steps[Math.min(stepIndex, program.steps.length - 1)] ?? null;
      },

      setParams: (p) => set({ params: { ...get().params, ...p } }),

      run: (p) => {
        clearT();
        const merged = { ...get().params, ...p };
        set({ params: merged, program: compile(merged), stepIndex: 0, isPlaying: false });
        get().play();
      },

      play: () => {
        const { program } = get();
        if (!program) return;
        if (get().stepIndex >= program.steps.length - 1) set({ stepIndex: 0 });
        set({ isPlaying: true });
        scheduleTick();
      },
      pause: () => {
        clearT();
        set({ isPlaying: false });
      },
      togglePlay: () => {
        const s = get();
        if (s.isPlaying) s.pause();
        else s.play();
      },
      stepForward: () => {
        clearT();
        const { program, stepIndex } = get();
        if (!program) return;
        set({ isPlaying: false, stepIndex: Math.min(stepIndex + 1, program.steps.length - 1) });
      },
      stepBack: () => {
        clearT();
        set({ isPlaying: false, stepIndex: Math.max(get().stepIndex - 1, 0) });
      },
      toStart: () => {
        clearT();
        set({ isPlaying: false, stepIndex: 0 });
      },
      toEnd: () => {
        clearT();
        const { program } = get();
        if (program) set({ isPlaying: false, stepIndex: program.steps.length - 1 });
      },
      setSpeed: (speed) => {
        set({ speed });
        if (get().isPlaying) scheduleTick();
      },
    };
  });
}
