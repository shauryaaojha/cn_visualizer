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
  /** Jump straight to a frame — the timeline and clickable canvases use it. */
  seek: (index: number) => void;
  /**
   * A frame waiting on a Predict-mode answer, or null. Set when forward motion
   * (Next or autoplay) reaches a frame the gate refuses; cleared by `release`.
   */
  pending: number | null;
  /** Installs the Predict-mode gate; null removes it. */
  setGate: (gate: ((index: number) => boolean) | null) => void;
  /** The gate said yes now — move onto the pending frame. */
  release: () => void;
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
    // Predict mode's veto over forward motion. Seeking and stepping back are
    // never gated: those are deliberate jumps, not "what happens next?".
    let gate: ((index: number) => boolean) | null = null;
    /** True if moving onto `next` may proceed; otherwise parks it as pending. */
    const allowed = (next: number) => {
      if (!gate || gate(next)) return true;
      clearT();
      set({ isPlaying: false, pending: next });
      return false;
    };
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
        if (!allowed(s.stepIndex + 1)) return;
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
      pending: null,

      currentStep: () => {
        const { program, stepIndex } = get();
        if (!program) return null;
        return program.steps[Math.min(stepIndex, program.steps.length - 1)] ?? null;
      },

      setParams: (p) => set({ params: { ...get().params, ...p } }),

      run: (p) => {
        clearT();
        const merged = { ...get().params, ...p };
        set({ params: merged, program: compile(merged), stepIndex: 0, isPlaying: false, pending: null });
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
        const next = Math.min(stepIndex + 1, program.steps.length - 1);
        if (next !== stepIndex && !allowed(next)) return;
        set({ isPlaying: false, stepIndex: next, pending: null });
      },
      stepBack: () => {
        clearT();
        set({ isPlaying: false, stepIndex: Math.max(get().stepIndex - 1, 0), pending: null });
      },
      toStart: () => {
        clearT();
        set({ isPlaying: false, stepIndex: 0, pending: null });
      },
      toEnd: () => {
        clearT();
        const { program } = get();
        if (program) set({ isPlaying: false, stepIndex: program.steps.length - 1, pending: null });
      },
      seek: (index) => {
        clearT();
        const { program } = get();
        if (!program) return;
        set({ isPlaying: false, pending: null, stepIndex: Math.min(Math.max(index, 0), program.steps.length - 1) });
      },
      setGate: (g) => {
        gate = g;
        if (!g) set({ pending: null });
      },
      release: () => {
        const { pending } = get();
        if (pending === null) return;
        set({ stepIndex: pending, pending: null });
      },
      setSpeed: (speed) => {
        set({ speed });
        if (get().isPlaying) scheduleTick();
      },
    };
  });
}
