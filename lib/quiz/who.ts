import "server-only";
import { randomInt } from "node:crypto";
import { auth } from "@/auth";
import { buildQuiz, type QuizId } from "@/lib/quiz/generators";
import { makeTicket } from "@/lib/quiz/ticket";
import { getUser } from "@/lib/users";

/** The signed-in user's id if they still exist, else "anon". Quiz tickets are bound to it. */
export async function currentWho(): Promise<string> {
  const id = (await auth())?.user?.id;
  return id && (await getUser(id)) ? id : "anon";
}

/** A new quiz for whoever is asking: fresh seed, signed ticket, and the questions without their answers. */
export async function issueQuiz(quiz: QuizId, secret: string) {
  const who = await currentWho();
  const seed = randomInt(1, 2 ** 31);
  const ticket = makeTicket({ quiz, seed, issuedAt: Date.now(), who }, secret);
  const questions = buildQuiz(quiz, seed).map(({ prompt, code, options }) => ({ prompt, code, options }));
  return { who, seed, ticket, questions };
}
