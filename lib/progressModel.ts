// ---------------------------------------------------------------------------
// progressModel: what "progress on a lesson" is, and how two copies of it
// combine. Pure, so the browser, the server and the tests share one set of rules.
//
// A student can make progress in several places: signed out, on a phone, on
// a laptop. Merging must never lose any of it:
//   best       largest share of the lesson's frames watched in one sitting (max wins)
//   completed  watched at least COMPLETE_AT of the frames in one sitting (sticky).
//              Jumping to the end is not watching it.
//   answers    first answer to each Predict question, right or wrong (first wins)
// ---------------------------------------------------------------------------

export interface LessonProgress {
  /** Lesson path, e.g. "/topics/fundamentals/topologies/bus". */
  lesson: string;
  /** 0..1, share of the lesson's frames seen in the best sitting. */
  best: number;
  completed: boolean;
  /** Frame to resume at. Last write wins. */
  lastFrame: number;
  /** question key → first answer was right. */
  answers: Record<string, boolean>;
  /** ms since epoch of the latest change. */
  updatedAt: number;
}

export const COMPLETE_AT = 0.9;
export const MAX_ANSWERS_PER_LESSON = 200;
export const MAX_ITEMS_PER_SYNC = 200;

/** A stable id for one Predict question: the question text, trimmed and shortened. */
export function questionKey(question: string): string {
  return question.trim().replace(/\s+/g, " ").slice(0, 120);
}

export function emptyProgress(lesson: string): LessonProgress {
  return { lesson, best: 0, completed: false, lastFrame: 0, answers: {}, updatedAt: 0 };
}

/** Records a sitting that has seen `seen` distinct frames of `total`, now on `frame`. */
export function withFrames(p: LessonProgress, seen: number, total: number, frame: number, now: number): LessonProgress {
  if (total <= 0) return p;
  const share = Math.min(Math.max(seen, 0), total) / total;
  const best = Math.max(p.best, share);
  const completed = p.completed || share >= COMPLETE_AT;
  const lastFrame = Math.min(Math.max(Math.floor(frame), 0), total - 1);
  if (best === p.best && completed === p.completed && lastFrame === p.lastFrame) return p;
  return { ...p, best, completed, lastFrame, updatedAt: now };
}

/** Records an answer. Only the first one for each question counts. */
export function withAnswer(p: LessonProgress, question: string, right: boolean, now: number): LessonProgress {
  const key = questionKey(question);
  if (!key || key in p.answers || Object.keys(p.answers).length >= MAX_ANSWERS_PER_LESSON) return p;
  return { ...p, answers: { ...p.answers, [key]: right }, updatedAt: now };
}

export function merge(a: LessonProgress, b: LessonProgress): LessonProgress {
  const [older, newer] = a.updatedAt <= b.updatedAt ? [a, b] : [b, a];
  // First answer wins: the older copy's answers override the newer copy's.
  const answers = { ...newer.answers, ...older.answers };
  const keys = Object.keys(answers).slice(0, MAX_ANSWERS_PER_LESSON);
  return {
    lesson: a.lesson,
    best: Math.max(a.best, b.best),
    completed: a.completed || b.completed,
    lastFrame: newer.lastFrame,
    answers: Object.fromEntries(keys.map((k) => [k, answers[k]])),
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
}

/**
 * Untrusted input (a request body, old localStorage) → a valid entry, or null.
 * `isLesson` says which paths are real lessons.
 */
export function sanitize(raw: unknown, isLesson: (path: string) => boolean, now: number): LessonProgress | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const lesson = typeof r.lesson === "string" ? r.lesson.replace(/\/+$/, "") : "";
  if (!isLesson(lesson)) return null;
  const num = (v: unknown, lo: number, hi: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(Math.max(v, lo), hi) : lo;
  const answers: Record<string, boolean> = {};
  if (r.answers && typeof r.answers === "object") {
    for (const [k, v] of Object.entries(r.answers as Record<string, unknown>)) {
      if (Object.keys(answers).length >= MAX_ANSWERS_PER_LESSON) break;
      const key = questionKey(k);
      if (key && typeof v === "boolean") answers[key] = v;
    }
  }
  return {
    lesson,
    best: num(r.best, 0, 1),
    completed: r.completed === true,
    lastFrame: Math.floor(num(r.lastFrame, 0, 10_000)),
    answers,
    // Never trust a timestamp from the future.
    updatedAt: Math.floor(num(r.updatedAt, 0, now)),
  };
}

export interface Tally {
  asked: number;
  right: number;
}

export function tally(entries: Iterable<LessonProgress>): Tally {
  let asked = 0;
  let right = 0;
  for (const e of entries) {
    for (const v of Object.values(e.answers)) {
      asked++;
      if (v) right++;
    }
  }
  return { asked, right };
}
