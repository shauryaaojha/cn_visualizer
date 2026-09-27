import Link from "next/link";
import { Panel } from "@/components/account/AccountShell";
import { QUIZ_IDS, quizTitle } from "@/lib/quiz/generators";
import type { QuizSummary } from "@/lib/quiz/store";

/** Best and last practice-quiz scores, one row per quiz. Links to the quiz only for the student themself. */
export function QuizPanel({ items, viewer = "self" }: { items: QuizSummary[]; viewer?: "self" | "faculty" }) {
  const by = new Map(items.map((s) => [s.quiz, s]));
  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">Practice quizzes</h2>
        {viewer === "self" && (
          <Link href="/practice" className="font-sans text-[14px] font-bold text-primary hover:underline">
            Practise →
          </Link>
        )}
      </div>
      <ul className="grid gap-x-md gap-y-1 sm:grid-cols-2">
        {QUIZ_IDS.map((id) => {
          const s = by.get(id);
          const row = (
            <>
              <span className="truncate">{quizTitle(id)}</span>
              <span className="shrink-0 font-mono text-[13px]">
                {s ? (
                  <>
                    <span className={s.best >= 0.75 ? "text-mint" : s.best >= 0.5 ? "text-primary" : "text-coral"}>
                      {Math.round(s.best * 100)}%
                    </span>{" "}
                    <span className="text-on-surface-variant">· {s.attempts}×</span>
                  </>
                ) : (
                  <span className="text-on-surface-variant/70">—</span>
                )}
              </span>
            </>
          );
          const cls = "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 font-sans text-[14px] text-on-surface-variant";
          return (
            <li key={id}>
              {viewer === "self" ? (
                <Link href={`/practice/${id}`} className={`${cls} hover:bg-black/15 hover:text-on-surface`}>
                  {row}
                </Link>
              ) : (
                <div className={cls}>{row}</div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 font-body-sm text-[12px] text-on-surface-variant/80">Best score and number of attempts.</p>
    </Panel>
  );
}
