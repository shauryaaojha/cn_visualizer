import Link from "next/link";
import { Panel } from "@/components/account/AccountShell";
import { Icon } from "@/components/ui/Icon";
import type { Assignment } from "@/lib/assignmentStore";
import type { AssignmentTally } from "@/lib/engagement";
import { unassign } from "./actions";
import { AssignForm, type LessonOption } from "./AssignForm";

const fmtDue = (ms: number) =>
  new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short", timeZone: "Asia/Kolkata" });

/** The section's assignments with who has done them, plus the form to add one. */
export function AssignmentsPanel({
  slug,
  items,
  total,
  myId,
  lessons,
  quizzes,
  minDate,
  now,
}: {
  slug: string;
  items: { a: Assignment; t: AssignmentTally }[];
  total: number;
  myId: string;
  lessons: LessonOption[];
  quizzes: { id: string; title: string }[];
  minDate: string;
  now: number;
}) {
  return (
    <Panel className="mt-md">
      <h2 className="font-headline-sm text-headline-sm text-on-surface">Assignments</h2>
      <p className="mb-3 font-body-sm text-[13px] text-on-surface-variant">
        Students in this section see these on their dashboard. A lesson counts once it&apos;s complete; a quiz once
        it&apos;s submitted after you assign it.
      </p>

      {items.length > 0 && (
        <ul className="mb-md flex flex-col gap-2">
          {items.map(({ a, t }) => {
            const late = now > a.due;
            const pct = total ? Math.round((t.done.length / total) * 100) : 0;
            return (
              <li key={a.id} className="rounded-lg border border-outline-variant/70 px-3 py-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Icon name={a.kind === "quiz" ? "functions" : "school"} className="text-[18px] text-primary" />
                  <Link href={a.kind === "quiz" ? `/practice/${a.target}` : a.target} className="font-bold text-on-surface hover:text-primary">
                    {a.title}
                  </Link>
                  <span className={`font-mono text-[13px] ${late ? "text-coral" : "text-on-surface-variant"}`}>
                    {late ? "was due" : "due"} {fmtDue(a.due)}
                  </span>
                  <span className="ml-auto font-mono text-[14px] text-on-surface">
                    <span className={pct === 100 ? "text-mint" : ""}>{t.done.length}</span> / {total} done
                  </span>
                  {a.facultyId === myId && (
                    <form action={unassign}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="slug" value={slug} />
                      <button aria-label={`Remove ${a.title}`} title="Remove this assignment" className="rounded-md border border-outline-variant p-1 text-on-surface-variant hover:border-coral hover:text-coral">
                        <Icon name="close" className="text-[14px]" />
                      </button>
                    </form>
                  )}
                </div>
                {a.note && <p className="mt-1 font-body-sm text-[13px] text-on-surface-variant">“{a.note}”</p>}
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-outline-variant/40">
                  <div className="h-full rounded-full bg-mint" style={{ width: `${pct}%` }} />
                </div>
                {(t.overdue.length > 0 || t.open.length > 0) && (
                  <details className="mt-1.5 font-body-sm text-[13px] text-on-surface-variant">
                    <summary className="cursor-pointer hover:text-on-surface">
                      {t.overdue.length > 0 ? `${t.overdue.length} late` : `${t.open.length} still to do`}
                      {a.facultyId !== myId && ` · set by ${a.facultyName}`}
                    </summary>
                    <p className="mt-1">{[...t.overdue, ...t.open].join(", ")}</p>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AssignForm slug={slug} lessons={lessons} quizzes={quizzes} minDate={minDate} />
    </Panel>
  );
}
