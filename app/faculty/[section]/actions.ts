"use server";

import { revalidatePath } from "next/cache";
import { createAssignment, deleteAssignment } from "@/lib/assignmentStore";
import { parseSectionSlug, sectionSlug } from "@/lib/classReport";
import { dueFromDateInput } from "@/lib/engagement";
import { LESSON_COLUMNS, requireFaculty, teaches } from "@/lib/faculty";
import { isQuizId, quizTitle } from "@/lib/quiz/generators";

export interface AssignState {
  error?: string;
  /** Set on success. The form keys on it to clear itself for the next one. */
  okAt?: number;
}

export async function assign(slug: string, _prev: AssignState, form: FormData): Promise<AssignState> {
  const s = parseSectionSlug(slug);
  const user = await requireFaculty(`/faculty/${slug}`);
  if (!s || !(await teaches(user._id.toHexString(), s))) return { error: "Not one of your sections." };

  const kind = form.get("kind") === "quiz" ? "quiz" : "lesson";
  const target = String(form.get(kind === "quiz" ? "quiz" : "lesson") ?? "");
  const lesson = LESSON_COLUMNS.find((l) => l.href === target);
  if (kind === "lesson" && !lesson) return { error: "Pick a lesson." };
  if (kind === "quiz" && !isQuizId(target)) return { error: "Pick a quiz." };

  const due = dueFromDateInput(String(form.get("due") ?? ""));
  if (!due) return { error: "Pick a due date." };
  if (due < Date.now()) return { error: "The due date has already passed." };

  await createAssignment({
    facultyId: user._id,
    facultyName: user.name,
    section: s,
    kind,
    target,
    title: kind === "lesson" ? lesson!.title : `${quizTitle(target as "1")} quiz`,
    note: String(form.get("note") ?? "").trim().slice(0, 200) || undefined,
    due: new Date(due),
  });
  revalidatePath(`/faculty/${sectionSlug(s)}`);
  return { okAt: Date.now() };
}

export async function unassign(form: FormData): Promise<void> {
  const user = await requireFaculty("/faculty");
  const slug = String(form.get("slug") ?? "");
  await deleteAssignment(String(form.get("id") ?? ""), user._id.toHexString());
  const s = parseSectionSlug(slug);
  if (s) revalidatePath(`/faculty/${sectionSlug(s)}`);
}
