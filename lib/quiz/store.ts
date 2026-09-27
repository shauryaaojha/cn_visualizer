import "server-only";
import { ObjectId } from "mongodb";
import { db } from "@/lib/db";
import type { QuizId } from "@/lib/quiz/generators";

// One document per graded quiz. The unique (userId, seed) index is what makes
// a ticket count once: submitting the same quiz again is graded but not saved.

export interface QuizResult {
  userId: ObjectId;
  quiz: QuizId;
  seed: number;
  score: number;
  total: number;
  /** Chosen option per question, -1 for skipped. */
  answers: number[];
  at: Date;
}

let indexed = false;
async function col() {
  const c = (await db()).collection<QuizResult>("quiz_results");
  if (!indexed) {
    await Promise.all([c.createIndex({ userId: 1, seed: 1 }, { unique: true }), c.createIndex({ userId: 1, at: -1 })]);
    indexed = true;
  }
  return c;
}

/** Saves a result. Returns false if this quiz (seed) was already saved for the user. */
export async function saveResult(r: QuizResult): Promise<boolean> {
  try {
    await (await col()).insertOne(r);
    return true;
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return false;
    throw err;
  }
}

export interface QuizSummary {
  quiz: QuizId;
  attempts: number;
  /** Best score as a fraction 0..1. */
  best: number;
  last: number;
  lastAt: number;
}

/** Per quiz, for each user: attempts, best and last score. */
export async function summaries(userIds: string[]): Promise<Map<string, QuizSummary[]>> {
  const out = new Map<string, QuizSummary[]>(userIds.map((id) => [id, []]));
  if (userIds.length === 0) return out;
  const docs = await (await col())
    .find({ userId: { $in: userIds.map((i) => new ObjectId(i)) } }, { sort: { at: 1 }, projection: { answers: 0 } })
    .toArray();
  const acc = new Map<string, Map<QuizId, QuizSummary>>();
  for (const d of docs) {
    const uid = d.userId.toHexString();
    const m = acc.get(uid) ?? new Map<QuizId, QuizSummary>();
    const frac = d.total ? d.score / d.total : 0;
    const s = m.get(d.quiz) ?? { quiz: d.quiz, attempts: 0, best: 0, last: 0, lastAt: 0 };
    s.attempts++;
    s.best = Math.max(s.best, frac);
    s.last = frac;
    s.lastAt = d.at.getTime();
    m.set(d.quiz, s);
    acc.set(uid, m);
  }
  for (const [uid, m] of acc) out.set(uid, [...m.values()]);
  return out;
}
