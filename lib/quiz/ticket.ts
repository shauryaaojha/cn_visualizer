// A quiz ticket: which quiz, which seed, when, and for whom, signed with the
// site secret. The browser holds it while answering and hands it back to be
// graded. Tampering with any part (a friendlier seed, someone else's ticket)
// breaks the signature. Pure apart from node:crypto, so tests can use it.

import { createHmac, timingSafeEqual } from "node:crypto";
import { isQuizId, type QuizId } from "./generators.ts";

export const TICKET_TTL_MS = 6 * 60 * 60 * 1000;

export interface Ticket {
  quiz: QuizId;
  seed: number;
  issuedAt: number;
  /** User id, or "anon" for signed-out practice. */
  who: string;
}

const sign = (body: string, secret: string) => createHmac("sha256", secret).update(body).digest("base64url");

export function makeTicket(t: Ticket, secret: string): string {
  const body = `${t.quiz}.${t.seed}.${t.issuedAt}.${t.who}`;
  return `${body}.${sign(body, secret)}`;
}

export function readTicket(raw: string, secret: string, who: string, now: number): Ticket | null {
  const parts = raw.split(".");
  if (parts.length !== 5) return null;
  const [quiz, seed, issuedAt, forWho, sig] = parts;
  const expected = sign(`${quiz}.${seed}.${issuedAt}.${forWho}`, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (forWho !== who || !isQuizId(quiz)) return null;
  const t = Number(issuedAt);
  if (!Number.isFinite(t) || now - t > TICKET_TTL_MS || t > now + 60_000) return null;
  return { quiz, seed: Number(seed), issuedAt: t, who: forWho };
}
