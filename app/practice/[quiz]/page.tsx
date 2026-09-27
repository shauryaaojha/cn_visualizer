import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountShell } from "@/components/account/AccountShell";
import { isQuizId, quizTitle } from "@/lib/quiz/generators";
import { issueQuiz } from "@/lib/quiz/who";
import { QuizRunner } from "./QuizRunner";

export const metadata: Metadata = { title: "Practice — CN_Visualizer" };

// Every visit is a new quiz with new numbers.
export default async function QuizPage({ params }: { params: Promise<{ quiz: string }> }) {
  const { quiz } = await params;
  if (!isQuizId(quiz)) notFound();
  const secret = process.env.AUTH_SECRET;
  if (!secret) notFound();

  // Only what the student needs to answer. Answers and explanations stay on the server.
  const { who, seed, ticket, questions } = await issueQuiz(quiz, secret);

  return (
    <AccountShell icon="functions" eyebrow="PRACTICE" title={quizTitle(quiz)} blurb="Fresh numbers every time. Answer them all, then submit to see what you got and why." width="max-w-3xl">
      <Link href="/practice" className="mb-md inline-block font-sans text-[14px] font-bold text-on-surface-variant hover:text-primary">
        ← All quizzes
      </Link>
      <QuizRunner key={seed} ticket={ticket} questions={questions} again={`/practice/${quiz}`} signedIn={who !== "anon"} />
    </AccountShell>
  );
}
