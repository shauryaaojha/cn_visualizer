// ---------------------------------------------------------------------------
// lessonKit — the small helpers every engine uses to meet the Unit 1 standard
// (ARCHITECTURE.md §9a): timeline labels and Predict questions.
//
// Imported by relative path with a `.ts` extension so `npm test` still runs
// under plain Node.
// ---------------------------------------------------------------------------

import type { BaseStep, Prediction } from "../types/visualization.ts";

/**
 * A Predict-mode question with the right answer placed at `slot` among the
 * wrong ones — deterministic, so the same lesson asks the same way every
 * time, but the answer is not always option 1.
 */
export function ask(question: string, right: string, wrong: string[], why: string, slot: number): Prediction {
  const seen = new Set([right]);
  const options = wrong.filter((w) => (seen.has(w) ? false : (seen.add(w), true))).slice(0, 3);
  const at = slot % (options.length + 1);
  options.splice(at, 0, right);
  return { question, options, answer: at, why };
}

/** Numeric distractors around a right answer, never negative, never equal. */
export function near(n: number, spread: number[] = [-1, 1, 2]): string[] {
  return spread.map((d) => n + d).filter((v) => v >= 0 && v !== n).map(String);
}

/**
 * Labels (and optionally questions) applied by frame index after an engine
 * has built its frames — for hand-written lessons where the frames are a
 * fixed script. Missing indices are left alone.
 */
export function tag<S extends BaseStep>(steps: S[], labels: (string | undefined)[], predicts: Record<number, Prediction> = {}): S[] {
  steps.forEach((s, i) => {
    if (labels[i] && !s.label) s.label = labels[i];
    if (predicts[i] && !s.predict) s.predict = predicts[i];
  });
  return steps;
}

/**
 * What an Inspector card says about a clicked thing — pure data, so facts
 * files and engines can build it without React. `FactBody` renders it.
 */
export interface FactSpec {
  /** The first sentence: what this thing is / does, in plain words. */
  lead: string;
  /** Real values from this run — "Links 3", "Cost 4", "Delay 2.1 ms". */
  rows?: [string, string][];
  /** Labelled chip rows — protocols, devices, examples. */
  chips?: { label: string; items: string[] }[];
  /** A second paragraph for the "why". */
  more?: string;
  /** The exam one-liner. */
  remember?: string;
}
