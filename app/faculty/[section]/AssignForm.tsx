"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { assign, type AssignState } from "./actions";

const INPUT =
  "w-full rounded-md border border-outline-variant bg-black/20 px-3 py-2 font-sans text-[14px] text-on-surface outline-none focus:border-primary";

export interface LessonOption {
  href: string;
  title: string;
  unit: string;
}

export function AssignForm({
  slug,
  lessons,
  quizzes,
  minDate,
}: {
  slug: string;
  lessons: LessonOption[];
  quizzes: { id: string; title: string }[];
  /** Today, as yyyy-mm-dd (IST), so past dates can't be picked. */
  minDate: string;
}) {
  const [state, action, pending] = useActionState<AssignState, FormData>(assign.bind(null, slug), {});
  const [kind, setKind] = useState<"lesson" | "quiz">("lesson");
  const units = [...new Set(lessons.map((l) => l.unit))];

  return (
    // Remount after each successful add, so the form clears for the next one.
    <form key={state.okAt ?? "form"} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="kind" value={kind} />
      <div className="flex gap-2" role="radiogroup" aria-label="What to assign">
        {(["lesson", "quiz"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-md border px-3 py-1.5 font-sans text-[14px] font-bold ${kind === k ? "border-primary bg-primary/15 text-primary" : "border-outline-variant text-on-surface-variant hover:border-primary/60"}`}
          >
            {k === "lesson" ? "A lesson" : "A practice quiz"}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
        {kind === "lesson" ? (
          <select name="lesson" required defaultValue="" className={INPUT} aria-label="Lesson">
            <option value="" disabled>
              Choose a lesson…
            </option>
            {units.map((u) => (
              <optgroup key={u} label={u}>
                {lessons
                  .filter((l) => l.unit === u)
                  .map((l) => (
                    <option key={l.href} value={l.href}>
                      {l.title}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        ) : (
          <select name="quiz" required defaultValue="" className={INPUT} aria-label="Quiz">
            <option value="" disabled>
              Choose a quiz…
            </option>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
          </select>
        )}
        <input type="date" name="due" required min={minDate} aria-label="Due date" className={INPUT} />
      </div>
      <input name="note" maxLength={200} placeholder="Note for students (optional)" className={INPUT} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={pending}
          className="flex items-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2 font-sans text-[14px] font-bold text-on-primary hover:bg-primary-fixed disabled:opacity-60"
        >
          <Icon name="flag" className="text-[16px]" />
          {pending ? "Assigning…" : "Assign to this section"}
        </button>
        {state.error && <p role="alert" className="font-body-sm text-[14px] text-coral">{state.error}</p>}
        {state.okAt && !state.error && <p className="font-body-sm text-[14px] text-mint">Assigned.</p>}
      </div>
    </form>
  );
}
