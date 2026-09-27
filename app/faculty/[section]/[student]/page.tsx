import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountShell } from "@/components/account/AccountShell";
import { ProgressBoard } from "@/components/account/ProgressBoard";
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
  const progress = await getProgress(u._id.toHexString());

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
    </AccountShell>
  );
}
