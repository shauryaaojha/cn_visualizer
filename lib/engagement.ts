// ---------------------------------------------------------------------------
// engagement: streaks, badges and assignment status. Pure, so tests pin the
// rules and every page computes them the same way.
//
// Days are India Standard Time (UTC+5:30, no daylight saving). A student
// working at 11 pm in Chennai is working "today", not tomorrow in UTC.
// ---------------------------------------------------------------------------

import type { LessonProgress } from "./progressModel.ts";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-09-27" for the IST calendar day containing `ms`. */
export function dayKey(ms: number): string {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The current time. A function so server components can read the clock without an impure call in render. */
export const nowMs = (): number => Date.now();

/** Today's IST date as yyyy-mm-dd, e.g. for a date input's min. */
export function todayKey(): string {
  return dayKey(Date.now());
}

const dayIndex = (key: string) => Math.round(Date.parse(`${key}T00:00:00Z`) / DAY_MS);

export interface Streak {
  /** Consecutive active days ending today, or yesterday if today has nothing yet. */
  current: number;
  best: number;
  activeToday: boolean;
  totalDays: number;
}

export function computeStreak(days: Iterable<string>, now: number): Streak {
  const idx = [...new Set(days)].map(dayIndex).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < idx.length; i++) {
    run = i > 0 && idx[i] === idx[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  const today = dayIndex(dayKey(now));
  const set = new Set(idx);
  const activeToday = set.has(today);
  // A streak stays alive through today until midnight: count back from today
  // if active, else from yesterday.
  let current = 0;
  for (let d = activeToday ? today : today - 1; set.has(d); d--) current++;
  return { current, best, activeToday, totalDays: idx.length };
}

// --- Badges -----------------------------------------------------------------

export interface BadgeInput {
  progress: LessonProgress[];
  /** Best score (0..1) per quiz tried. */
  quizzes: { quiz: string; best: number }[];
  /** Built lessons per unit label ("Unit 1" … "Capstone"). */
  units: { unit: string; lessons: string[] }[];
  streak: Streak;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  /** e.g. "12 / 30", shown while not earned. */
  progress?: string;
}

export function computeBadges(input: BadgeInput): Badge[] {
  const done = new Set(input.progress.filter((p) => p.completed).map((p) => p.lesson));
  let asked = 0;
  let right = 0;
  for (const p of input.progress)
    for (const v of Object.values(p.answers)) {
      asked++;
      if (v) right++;
    }
  const b = (id: string, title: string, description: string, have: number, need: number): Badge => ({
    id,
    title,
    description,
    earned: have >= need,
    progress: have >= need ? undefined : `${Math.min(have, need)} / ${need}`,
  });

  const badges: Badge[] = [
    b("first-lesson", "First steps", "Finish your first lesson.", done.size, 1),
    b("ten-lessons", "Getting going", "Finish 10 lessons.", done.size, 10),
    ...input.units.map((u) =>
      b(
        `unit-${u.unit.toLowerCase().replace(/\s+/g, "-")}`,
        `${u.unit} complete`,
        `Finish every lesson in ${u.unit}.`,
        u.lessons.filter((l) => done.has(l)).length,
        u.lessons.length,
      ),
    ),
    b("predictor", "Predictor", "Get 20 Predict questions right on the first try.", right, 20),
    {
      id: "sharp",
      title: "Sharp eye",
      description: "80% or better on at least 20 Predict first tries.",
      earned: asked >= 20 && right / asked >= 0.8,
      progress: asked < 20 ? `${asked} / 20 tried` : right / asked >= 0.8 ? undefined : `${Math.round((right / asked) * 100)}% now`,
    },
    {
      id: "quiz-ace",
      title: "Quiz ace",
      description: "Score 100% on any practice quiz.",
      earned: input.quizzes.some((q) => q.best >= 1),
      progress: input.quizzes.some((q) => q.best >= 1) ? undefined : input.quizzes.length ? `best ${Math.round(Math.max(...input.quizzes.map((q) => q.best)) * 100)}% so far` : "not yet",
    },
    b("all-rounder", "All-rounder", "Try all six practice quizzes.", input.quizzes.length, 6),
    b("streak-3", "On a roll", "Study 3 days in a row.", input.streak.best, 3),
    b("streak-7", "Week strong", "Study 7 days in a row.", input.streak.best, 7),
  ];
  return badges;
}

// --- Assignments --------------------------------------------------------------

export interface AssignmentLike {
  kind: "lesson" | "quiz";
  /** Lesson path or quiz id. */
  target: string;
  due: number;
  createdAt: number;
}

export type AssignmentStatus = "done" | "open" | "overdue";

/**
 * Lesson: done once the lesson is complete, whenever that happened.
 * Quiz: done once that quiz has been submitted since it was assigned, so an
 * old attempt from before the assignment doesn't count.
 */
export function assignmentStatus(
  a: AssignmentLike,
  progress: LessonProgress[],
  quizAttempts: { quiz: string; at: number }[],
  now: number,
): AssignmentStatus {
  const done =
    a.kind === "lesson"
      ? progress.some((p) => p.lesson === a.target && p.completed)
      : quizAttempts.some((q) => q.quiz === a.target && q.at >= a.createdAt);
  if (done) return "done";
  return now > a.due ? "overdue" : "open";
}

/** Due date input ("2026-10-03") → end of that day in IST, as ms. */
export function dueFromDateInput(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const t = Date.parse(`${value}T23:59:59Z`);
  return Number.isNaN(t) ? null : t - IST_OFFSET_MS;
}

export interface AssignmentTally {
  done: string[];
  open: string[];
  overdue: string[];
}

/** Which students (by name) have done an assignment, still have time, or are late. */
export function tallyAssignment(
  a: AssignmentLike,
  students: { id: string; name: string }[],
  progress: Map<string, LessonProgress[]>,
  attempts: Map<string, { quiz: string; at: number }[]>,
  now = Date.now(),
): AssignmentTally {
  const t: AssignmentTally = { done: [], open: [], overdue: [] };
  for (const s of students) t[assignmentStatus(a, progress.get(s.id) ?? [], attempts.get(s.id) ?? [], now)].push(s.name);
  return t;
}
