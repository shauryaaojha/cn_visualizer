import "server-only";
import { activeDays } from "@/lib/activity";
import { assignmentsFor, type Assignment } from "@/lib/assignmentStore";
import { assignmentStatus, computeBadges, computeStreak, nowMs, type AssignmentStatus, type Badge, type Streak } from "@/lib/engagement";
import { LESSON_COLUMNS } from "@/lib/faculty";
import type { LessonProgress } from "@/lib/progressModel";
import { attemptsFor, type QuizSummary } from "@/lib/quiz/store";
import type { UserDoc } from "@/lib/users";

// Everything the dashboard shows beyond raw progress, for one student:
// streak, badges, and their section's assignments with a status each.

const UNITS = [...new Set(LESSON_COLUMNS.map((l) => l.unit))].map((unit) => ({
  unit,
  lessons: LESSON_COLUMNS.filter((l) => l.unit === unit).map((l) => l.href),
}));

export interface Engagement {
  streak: Streak;
  badges: Badge[];
  assignments: { a: Assignment; status: AssignmentStatus }[];
}

export async function loadEngagement(user: UserDoc, progress: LessonProgress[], quizzes: QuizSummary[]): Promise<Engagement> {
  const uid = user._id.toHexString();
  const p = user.profile;
  const inSection = user.role === "student" && p?.dept && p.year && p.section;
  const [days, attempts, assignments] = await Promise.all([
    activeDays(uid),
    attemptsFor([uid]),
    inSection ? assignmentsFor({ dept: p.dept!, year: p.year!, section: p.section! }) : Promise.resolve([]),
  ]);
  const now = nowMs();
  const streak = computeStreak(days, now);
  const mine = attempts.get(uid) ?? [];
  return {
    streak,
    badges: computeBadges({ progress, quizzes, units: UNITS, streak }),
    assignments: assignments.map((a) => ({ a, status: assignmentStatus(a, progress, mine, now) })),
  };
}
