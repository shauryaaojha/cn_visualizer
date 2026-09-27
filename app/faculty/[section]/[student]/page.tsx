import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountShell } from "@/components/account/AccountShell";
import { ProgressBoard } from "@/components/account/ProgressBoard";
import { AssignedPanel, StreakAndBadges } from "@/components/account/EngagementPanels";
import { QuizPanel } from "@/components/account/QuizPanel";
import { loadEngagement } from "@/lib/studentEngagement";
import { summaries } from "@/lib/quiz/store";
import { parseSectionSlug, sectionLabel } from "@/lib/classReport";
import { requireFaculty, studentForFaculty } from "@/lib/faculty";
import { getProgress } from "@/lib/progressStore";

export const metadata: Metadata = { title: "Student — CN_Visualizer" };

export default async function StudentPage({ params }: { params: Promise<{ section: string; student: string }> }) {
  const { section: slug, student } = await params;
  const s = parseSectionSlug(slug);
  if (!s) notFound();
  const me = await requireFaculty(`/faculty/${slug}/${student}`);
  // Only students in a section this faculty member teaches.
  const u = await studentForFaculty(me._id.toHexString(), student);
  if (!u) notFound();
  const sid = u._id.toHexString();
  const [progress, quizzes] = await Promise.all([getProgress(sid), summaries([sid])]);
  const theirQuizzes = quizzes.get(sid) ?? [];
  const engagement = await loadEngagement(u, progress, theirQuizzes);

  return (
    <AccountShell
      icon="account_circle"
      eyebrow={`STUDENT · ${sectionLabel(s)}`}
      title={u.name}
      blurb={[u.profile?.regNo, u.email].filter(Boolean).join(" · ")}
      width="max-w-6xl"
    >
      <Link href={`/faculty/${slug}`} className="mb-md inline-block font-sans text-[14px] font-bold text-on-surface-variant hover:text-primary">
        ← Back to the section
      </Link>
      <ProgressBoard items={progress} viewer="faculty" />
      <div className="mt-md grid gap-md">
        <AssignedPanel items={engagement.assignments} viewer="faculty" />
        <StreakAndBadges e={engagement} viewer="faculty" />
        <QuizPanel items={theirQuizzes} viewer="faculty" />
      </div>
    </AccountShell>
  );
}
