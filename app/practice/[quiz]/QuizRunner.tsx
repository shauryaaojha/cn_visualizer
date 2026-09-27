"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Panel } from "@/components/account/AccountShell";
import { Icon } from "@/components/ui/Icon";
import { submitQuiz, type Graded } from "../actions";

export interface ShownQuestion {
  prompt: string;
  code?: string;
  options: string[];
}

/**
 * Answer every question, submit once, then review: right/wrong per question,
 * why, and a link to the lesson. The page holds no answers; they only come
 * back from the server with the grade.
 */
export function QuizRunner({ ticket, questions, again, signedIn }: { ticket: string; questions: ShownQuestion[]; again: string; signedIn: boolean }) {
  const [chosen, setChosen] = useState<number[]>(() => questions.map(() => -1));
  const [result, setResult] = useState<Graded | null>(null);
  const [pending, start] = useTransition();
  const answered = chosen.filter((c) => c >= 0).length;
  const done = !!result?.items;

  const submit = () =>
    start(async () => {
      setResult(await submitQuiz(ticket, chosen));
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

  return (
    <div className="flex flex-col gap-md">
      {result?.error && (
        <p role="alert" className="rounded-lg border border-coral/60 bg-coral/10 px-md py-sm text-coral">
          {result.error}{" "}
          <a href={again} className="font-bold underline">
            New quiz
          </a>
        </p>
      )}

      {done && (
        <Panel className="flex flex-wrap items-center gap-md border-primary/60">
          <p className="font-mono text-[34px] font-bold text-on-surface">
            {result.score}
            <span className="text-[20px] text-on-surface-variant"> / {result.total}</span>
          </p>
          <div className="min-w-0 flex-1 font-body-sm text-[14px] text-on-surface-variant">
            {result.saved === true && "Saved to your progress."}
            {result.saved === false && "You already submitted this quiz, so this try wasn't counted again."}
            {result.saved === null && (
              <>
                Not saved. <Link href="/login?next=/practice" className="text-primary underline">Sign in</Link> to keep your scores.
              </>
            )}
            <br />
            Wrong answers link to the lesson that explains them.
          </div>
          <a
            href={again}
            className="flex items-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 font-sans text-[15px] font-bold text-on-primary hover:bg-primary-fixed"
          >
            <Icon name="refresh" className="text-[18px]" />
            New numbers
          </a>
        </Panel>
      )}

      <ol className="flex flex-col gap-md">
        {questions.map((q, i) => {
          const g = result?.items?.[i];
          return (
            <li key={i}>
              <Panel className={g ? (g.right ? "border-mint/60" : "border-coral/60") : ""}>
                <p className="mb-2 font-label-caps text-[12px] uppercase text-on-surface-variant">
                  Question {i + 1}
                  {g && (g.right ? " · right" : g.chosen < 0 ? " · skipped" : " · wrong")}
                </p>
                <p className="font-body-md text-[16px] text-on-surface">{q.prompt}</p>
                {q.code && (
                  <pre className="scroll-thin mt-2 overflow-x-auto rounded-md bg-black/25 px-3 py-2 font-mono text-[14px] text-primary">{q.code}</pre>
                )}
                <div role="radiogroup" aria-label={`Question ${i + 1}`} className="mt-3 grid gap-2 sm:grid-cols-2">
                  {q.options.map((o, j) => {
                    const picked = chosen[i] === j;
                    let cls = picked ? "border-primary bg-primary/15 text-on-surface" : "border-outline-variant text-on-surface-variant hover:border-primary/70";
                    if (g) {
                      if (j === g.answer) cls = "border-mint bg-mint/15 text-on-surface";
                      else if (picked) cls = "border-coral bg-coral/10 text-on-surface";
                      else cls = "border-outline-variant/60 text-on-surface-variant/70";
                    }
                    return (
                      <button
                        key={j}
                        type="button"
                        role="radio"
                        aria-checked={picked}
                        disabled={done}
                        onClick={() => setChosen((c) => c.map((x, k) => (k === i ? j : x)))}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left font-mono text-[14px] transition-colors ${cls}`}
                      >
                        <span className="w-5 shrink-0 text-on-surface-variant">{String.fromCharCode(65 + j)}</span>
                        <span className="min-w-0 break-words">{o}</span>
                      </button>
                    );
                  })}
                </div>
                {g && (
                  <p className="mt-3 font-body-sm text-[14px] text-on-surface-variant">
                    {g.why}{" "}
                    {!g.right && (
                      <Link href={g.lesson} className="font-bold text-primary hover:underline">
                        Review the lesson →
                      </Link>
                    )}
                  </p>
                )}
              </Panel>
            </li>
          );
        })}
      </ol>

      {!done && (
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-low/95 px-md py-3 backdrop-blur">
          <span className="font-body-sm text-[14px] text-on-surface-variant">
            {answered} of {questions.length} answered{!signedIn && " · signed out, score won't be saved"}
          </span>
          <button
            onClick={submit}
            disabled={pending || answered === 0}
            className="flex items-center gap-2 rounded-lg border border-primary bg-primary px-5 py-2.5 font-sans text-[15px] font-bold text-on-primary hover:bg-primary-fixed disabled:opacity-60"
          >
            <Icon name="verified" className="text-[18px]" />
            {pending ? "Marking…" : answered < questions.length ? "Submit (skipped count as wrong)" : "Submit"}
          </button>
        </div>
      )}
    </div>
  );
}
