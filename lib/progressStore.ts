import "server-only";
import { ObjectId } from "mongodb";
import { SECTIONS, leavesOfSection } from "@/data/curriculum";
import { db } from "@/lib/db";
import { merge, type LessonProgress } from "@/lib/progressModel";

// One document per (user, lesson). Writes merge with what is already stored
// (lib/progressModel.ts), so two devices syncing out of order lose nothing.

interface ProgressDoc extends LessonProgress {
  userId: ObjectId;
}

/** Every lesson that exists and is built. Progress on anything else is refused. */
export const LESSONS: ReadonlySet<string> = new Set(
  SECTIONS.flatMap((s) => leavesOfSection(s.slug))
    .filter((l) => l.status === "available")
    .map((l) => l.href),
);

let indexed = false;
async function col() {
  const c = (await db()).collection<ProgressDoc>("progress");
  if (!indexed) {
    await c.createIndex({ userId: 1, lesson: 1 }, { unique: true });
    indexed = true;
  }
  return c;
}

const strip = ({ lesson, best, completed, lastFrame, answers, updatedAt }: LessonProgress): LessonProgress => ({
  lesson,
  best,
  completed,
  lastFrame,
  answers,
  updatedAt,
});

export async function getProgress(userId: string): Promise<LessonProgress[]> {
  const c = await col();
  const docs = await c.find({ userId: new ObjectId(userId) }, { projection: { _id: 0, userId: 0 } }).toArray();
  return docs.map(strip);
}

/** Merges `items` into the stored copies and returns the merged result for each. */
export async function saveProgress(userId: string, items: LessonProgress[]): Promise<LessonProgress[]> {
  if (items.length === 0) return [];
  const c = await col();
  const uid = new ObjectId(userId);
  const existing = new Map(
    (await c.find({ userId: uid, lesson: { $in: items.map((i) => i.lesson) } }).toArray()).map((d) => [d.lesson, strip(d)]),
  );
  // A batch may name the same lesson twice, so merge into the map as we go.
  const touched = new Set<string>();
  for (const i of items) {
    const prev = existing.get(i.lesson);
    existing.set(i.lesson, prev ? merge(prev, i) : i);
    touched.add(i.lesson);
  }
  const latest = [...touched].map((l) => existing.get(l)!);
  await c.bulkWrite(
    latest.map((m) => ({
      replaceOne: { filter: { userId: uid, lesson: m.lesson }, replacement: { ...m, userId: uid }, upsert: true },
    })),
    { ordered: false },
  );
  return latest;
}
