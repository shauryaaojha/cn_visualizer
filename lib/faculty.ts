import "server-only";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { SECTIONS, leavesOfSection } from "@/data/curriculum";
import { parseEmailList } from "@/lib/authRules";
import { normSection, sameSection, type LessonInfo, type SectionRef, type StudentInfo } from "@/lib/classReport";
import { db } from "@/lib/db";
import type { LessonProgress } from "@/lib/progressModel";
import { requireUser } from "@/lib/session";
import { getUser, type UserDoc } from "@/lib/users";

// Faculty = the faculty role from sign-in AND still on FACULTY_EMAILS now.
// The allowlist is read on every request, so removing someone takes effect
// at once, without waiting for their 30-day cookie to expire.

export function isFaculty(user: UserDoc | null): user is UserDoc {
  return !!user && user.role === "faculty" && parseEmailList(process.env.FACULTY_EMAILS).has(user.email);
}

/** Every built lesson in course order, with its unit label, for columns and CSV. */
export const LESSON_COLUMNS: LessonInfo[] = SECTIONS.flatMap((s) =>
  leavesOfSection(s.slug)
    .filter((l) => l.status === "available")
    .map((l) => ({ href: l.href, title: l.title, unit: s.unit <= 5 ? `Unit ${s.unit}` : "Capstone" })),
);

interface TeachesDoc {
  userId: ObjectId;
  sections: SectionRef[];
}

const teachesCol = async () => (await db()).collection<TeachesDoc>("faculty_sections");

export async function getTeaches(userId: string): Promise<SectionRef[]> {
  const doc = await (await teachesCol()).findOne({ userId: new ObjectId(userId) });
  return doc?.sections ?? [];
}

export async function addTeach(userId: string, s: SectionRef): Promise<void> {
  const n = normSection(s.dept, s.year, s.section);
  const current = await getTeaches(userId);
  if (current.some((c) => sameSection(c, n)) || current.length >= 30) return;
  await (await teachesCol()).updateOne({ userId: new ObjectId(userId) }, { $push: { sections: n } }, { upsert: true });
}

export async function removeTeach(userId: string, s: SectionRef): Promise<void> {
  const current = await getTeaches(userId);
  await (await teachesCol()).updateOne(
    { userId: new ObjectId(userId) },
    { $set: { sections: current.filter((c) => !sameSection(c, s)) } },
  );
}

export async function teaches(userId: string, s: SectionRef): Promise<boolean> {
  return (await getTeaches(userId)).some((c) => sameSection(c, s));
}

function info(u: UserDoc): StudentInfo {
  return { id: u._id.toHexString(), name: u.name, email: u.email, netId: u.netId, regNo: u.profile?.regNo };
}

/** Students whose onboarding details put them in `s`. Faculty accounts are never listed. */
export async function studentsIn(s: SectionRef): Promise<StudentInfo[]> {
  const n = normSection(s.dept, s.year, s.section);
  const users = await (await db())
    .collection<UserDoc>("users")
    .find({ role: "student", "profile.year": n.year })
    .toArray();
  // Department and section are typed by students, so they are matched here,
  // normalised, rather than exactly in the query.
  return users
    .filter((u) => u.profile?.dept && u.profile.section && sameSection({ dept: u.profile.dept, year: n.year, section: u.profile.section }, n))
    .map(info);
}

/** How many students each of `sections` has, for the /faculty list. */
export async function sectionCounts(sections: SectionRef[]): Promise<number[]> {
  return Promise.all(sections.map(async (s) => (await studentsIn(s)).length));
}

export async function progressFor(ids: string[]): Promise<Map<string, LessonProgress[]>> {
  const out = new Map<string, LessonProgress[]>(ids.map((id) => [id, []]));
  if (ids.length === 0) return out;
  const docs = await (await db())
    .collection<LessonProgress & { userId: ObjectId }>("progress")
    .find({ userId: { $in: ids.map((i) => new ObjectId(i)) } }, { projection: { _id: 0 } })
    .toArray();
  for (const { userId, ...p } of docs) out.get(userId.toHexString())?.push(p);
  return out;
}

/** A student this faculty member may see: exists, is a student, and is in one of their sections. */
export async function studentForFaculty(facultyId: string, studentId: string): Promise<UserDoc | null> {
  const u = await getUser(studentId);
  if (!u || u.role !== "student" || !u.profile?.dept || !u.profile.year || !u.profile.section) return null;
  const s = { dept: u.profile.dept, year: u.profile.year, section: u.profile.section };
  return (await teaches(facultyId, s)) ? u : null;
}

/** For faculty pages: the signed-in faculty member, or a redirect (sign in, or back to their own dashboard). */
export async function requireFaculty(from: string): Promise<UserDoc> {
  const user = await requireUser(from);
  if (!isFaculty(user)) redirect("/dashboard");
  return user;
}
