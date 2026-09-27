import type { Metadata } from "next";
import Link from "next/link";
import { AccountShell, Panel } from "@/components/account/AccountShell";
import { Icon } from "@/components/ui/Icon";
import { QUIZ_IDS, quizTitle, UNIT_GENERATORS } from "@/lib/quiz/generators";
import { summaries } from "@/lib/quiz/store";
import { currentWho } from "@/lib/quiz/who";

export const metadata: Metadata = { title: "Practice — CN_Visualizer" };

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default async function PracticePage() {
  const who = await currentWho();
  const mine = who === "anon" ? [] : ((await summaries([who])).get(who) ?? []);
  const byQuiz = new Map(mine.map((s) => [s.quiz, s]));

  return (
    <AccountShell
      icon="functions"
      eyebrow="PRACTICE"
      title="Practice quizzes"
      blurb="Exam-style numericals and concepts, generated fresh every attempt, so you practise the method rather than memorising answers."
      width="max-w-4xl"
    >
      {who === "anon" && (
        <p className="mb-md rounded-lg border border-amber/50 bg-amber/10 px-md py-sm font-body-sm text-[14px] text-amber">
          You can practise signed out, but scores are only saved when you{" "}
          <Link href="/login?next=/practice" className="font-bold underline">
            sign in
          </Link>
          .
        </p>
      )}
      <div className="grid gap-md sm:grid-cols-2">
        {QUIZ_IDS.map((id) => {
          const s = byQuiz.get(id);
          const count = id === "mixed" ? 10 : 8;
          const kinds = id === "mixed" ? Object.values(UNIT_GENERATORS).reduce((n, u) => n + u.gens.length, 0) : UNIT_GENERATORS[id].gens.length;
          return (
            <Link key={id} href={`/practice/${id}`} className="group">
              <Panel className="h-full transition-colors group-hover:border-primary/70">
                <p className="font-headline-sm text-[20px] text-on-surface group-hover:text-primary">{quizTitle(id)}</p>
                <p className="font-body-sm text-[14px] text-on-surface-variant">
                  {count} questions · {kinds} question types
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="font-mono text-[14px] text-on-surface-variant">
                    {s ? (
                      <>
                        best <span className="font-bold text-mint">{pct(s.best)}</span> · last {pct(s.last)} · {s.attempts}×
                      </>
                    ) : (
                      "not tried yet"
                    )}
                  </span>
                  <span className="flex items-center gap-1 font-sans text-[14px] font-bold text-primary">
                    Start <Icon name="east" className="text-[16px]" />
                  </span>
                </div>
              </Panel>
            </Link>
          );
        })}
      </div>
    </AccountShell>
  );
}
