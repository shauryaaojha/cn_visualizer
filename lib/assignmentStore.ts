import "server-only";
import { ObjectId } from "mongodb";
import { normSection, sameSection, type SectionRef } from "@/lib/classReport";
import { db } from "@/lib/db";

// Faculty set work for a section: a lesson or a practice quiz, due by a date.
// Students in that section see every assignment set for it, by any faculty.

export interface AssignmentDoc {
  _id: ObjectId;
  facultyId: ObjectId;
  facultyName: string;
  section: SectionRef;
  kind: "lesson" | "quiz";
  /** Lesson path or quiz id. */
  target: string;
  title: string;
  note?: string;
  due: Date;
  createdAt: Date;
}

export interface Assignment {
  id: string;
  facultyId: string;
  facultyName: string;
  kind: "lesson" | "quiz";
  target: string;
  title: string;
  note?: string;
  due: number;
  createdAt: number;
}

const view = (d: AssignmentDoc): Assignment => ({
  id: d._id.toHexString(),
  facultyId: d.facultyId.toHexString(),
  facultyName: d.facultyName,
  kind: d.kind,
  target: d.target,
  title: d.title,
  note: d.note,
  due: d.due.getTime(),
  createdAt: d.createdAt.getTime(),
});

let indexed = false;
async function col() {
  const c = (await db()).collection<AssignmentDoc>("assignments");
  if (!indexed) {
    await c.createIndex({ "section.year": 1, "section.section": 1, due: 1 });
    indexed = true;
  }
  return c;
}

export async function createAssignment(a: Omit<AssignmentDoc, "_id" | "createdAt">): Promise<void> {
  await (await col()).insertOne({ ...a, section: normSection(a.section.dept, a.section.year, a.section.section), _id: new ObjectId(), createdAt: new Date() });
}

/** Only the faculty member who set it can remove it. */
export async function deleteAssignment(id: string, facultyId: string): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  await (await col()).deleteOne({ _id: new ObjectId(id), facultyId: new ObjectId(facultyId) });
}

/** Assignments for a section, soonest due first. */
export async function assignmentsFor(s: SectionRef): Promise<Assignment[]> {
  const n = normSection(s.dept, s.year, s.section);
  const docs = await (await col()).find({ "section.year": n.year }, { sort: { due: 1 } }).toArray();
  return docs.filter((d) => sameSection(d.section, n)).map(view);
}
