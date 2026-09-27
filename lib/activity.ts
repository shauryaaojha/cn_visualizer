import "server-only";
import { ObjectId } from "mongodb";
import { db } from "@/lib/db";
import { dayKey } from "@/lib/engagement";

// One document per (user, IST day) with any activity: progress synced or a
// quiz submitted. Streaks read it. Progress and quiz timestamps are also used,
// so history from before this collection existed still counts.

interface ActivityDoc {
  userId: ObjectId;
  day: string;
}

let indexed = false;
async function col() {
  const c = (await db()).collection<ActivityDoc>("activity");
  if (!indexed) {
    await c.createIndex({ userId: 1, day: 1 }, { unique: true });
    indexed = true;
  }
  return c;
}

export async function recordActivity(userId: string, at = Date.now()): Promise<void> {
  const uid = new ObjectId(userId);
  const day = dayKey(at);
  await (await col()).updateOne({ userId: uid, day }, { $setOnInsert: { userId: uid, day } }, { upsert: true });
}

/** Every IST day the user was active, from the log plus progress and quiz timestamps. */
export async function activeDays(userId: string): Promise<Set<string>> {
  const uid = new ObjectId(userId);
  const d = await db();
  const [log, progress, quizzes] = await Promise.all([
    (await col()).find({ userId: uid }, { projection: { day: 1 } }).toArray(),
    d.collection("progress").find({ userId: uid }, { projection: { updatedAt: 1 } }).toArray(),
    d.collection("quiz_results").find({ userId: uid }, { projection: { at: 1 } }).toArray(),
  ]);
  const days = new Set(log.map((x) => x.day));
  for (const p of progress) if (typeof p.updatedAt === "number" && p.updatedAt > 0) days.add(dayKey(p.updatedAt));
  for (const q of quizzes) if (q.at instanceof Date) days.add(dayKey(q.at.getTime()));
  return days;
}
