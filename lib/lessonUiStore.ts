// ---------------------------------------------------------------------------
// Lesson UI state — everything about the lesson *page* that is not the
// animation itself: which panels are open, whether Predict mode is on, and
// what the student last clicked on the canvas.
//
// Canvases write a selection here when something is clicked; the Inspector
// renders it. That keeps each canvas free to decide what is inspectable (a
// layer, a header, a node, a link) without the shell knowing any engine.
// ---------------------------------------------------------------------------

import type { ReactNode } from "react";
import { create } from "zustand";

export interface Selection {
  /** Stable id so re-clicking the same thing toggles it off. */
  key: string;
  /** Small caps line above the title — "Layer", "Header", "Node". */
  kind: string;
  title: string;
  /** Accent colour for the title bar. */
  color?: string;
  body: ReactNode;
}

interface LessonUi {
  predict: boolean;
  setupOpen: boolean;
  inspectorOpen: boolean;
  selection: Selection | null;
  /** Per-run tally of Predict answers. */
  score: { right: number; asked: number };
  togglePredict: () => void;
  setSetupOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  select: (s: Selection | null) => void;
  /** Select, or clear if the same thing is clicked again. */
  toggleSelect: (s: Selection) => void;
  recordAnswer: (right: boolean) => void;
  resetScore: () => void;
}

export const useLessonUi = create<LessonUi>((set, get) => ({
  predict: false,
  setupOpen: false,
  inspectorOpen: true,
  selection: null,
  score: { right: 0, asked: 0 },
  togglePredict: () => set((s) => ({ predict: !s.predict, score: { right: 0, asked: 0 } })),
  setSetupOpen: (setupOpen) => set({ setupOpen }),
  setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
  select: (selection) => set({ selection }),
  toggleSelect: (sel) => {
    const cur = get().selection;
    set({ selection: cur?.key === sel.key ? null : sel, inspectorOpen: true });
  },
  recordAnswer: (right) =>
    set((s) => ({ score: { right: s.score.right + (right ? 1 : 0), asked: s.score.asked + 1 } })),
  resetScore: () => set({ score: { right: 0, asked: 0 } }),
}));
