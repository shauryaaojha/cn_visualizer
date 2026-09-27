"use server";

import { ObjectId } from "mongodb";
import { buildQuiz } from "@/lib/quiz/generators";
import { saveResult } from "@/lib/quiz/store";
import { readTicket } from "@/lib/quiz/ticket";
import { currentWho } from "@/lib/quiz/who";

export interface GradedItem {
  chosen: number;
  answer: number;
  right: boolean;
  why: string;
  lesson: string;
}

export interface Graded {
  score?: number;
  total?: number;
  /** true = saved, false = already saved earlier (not counted twice), null = signed out. */
  saved?: boolean | null;
  items?: GradedItem[];
  error?: string;
}

export async function submitQuiz(rawTicket: string, chosen: number[]): Promise<Graded> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return { error: "Quizzes aren't configured on this deployment." };
  const who = await currentWho();
  const t = readTicket(String(rawTicket), secret, who, Date.now());
  if (!t) return { error: "This quiz has expired or belongs to another session. Start a new one." };

  const questions = buildQuiz(t.quiz, t.seed);
  const picks = questions.map((_, i) => {
    const c = Number(Array.isArray(chosen) ? chosen[i] : -1);
    return Number.isInteger(c) && c >= 0 && c < 4 ? c : -1;
  });
  const items = questions.map((q, i) => ({
    chosen: picks[i],
    answer: q.answer,
    right: picks[i] === q.answer,
    why: q.why,
    lesson: q.lesson,
  }));
  const score = items.filter((x) => x.right).length;

  let saved: boolean | null = null;
  if (who !== "anon") {
    saved = await saveResult({
      userId: new ObjectId(who),
      quiz: t.quiz,
      seed: t.seed,
      score,
      total: questions.length,
      answers: picks,
      at: new Date(),
    });
  }
  return { score, total: questions.length, saved, items };
}
