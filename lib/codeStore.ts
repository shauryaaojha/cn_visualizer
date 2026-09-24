import "server-only";
import { db } from "@/lib/db";
import {
  CODE_TTL_MS,
  hashCode,
  hashesMatch,
  MAX_GUESSES,
  MAX_SENDS_PER_ADDRESS,
  MAX_SENDS_TOTAL,
  newCode,
  SEND_WINDOW_MS,
} from "@/lib/loginCode";

// Mongo half of the email codes. One document per code sent. It stays until
// the send window closes (so rate limits can count it), but it only works
// until expiresAt.

interface CodeDoc {
  email: string;
  hash: string;
  guesses: number;
  createdAt: Date;
  expiresAt: Date;
  /** TTL index: Mongo deletes the document at this time. */
  purgeAt: Date;
}

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
};

let indexed = false;
async function codes() {
  const c = (await db()).collection<CodeDoc>("login_codes");
  if (!indexed) {
    await Promise.all([
      c.createIndex({ purgeAt: 1 }, { expireAfterSeconds: 0 }),
      c.createIndex({ email: 1, createdAt: -1 }),
    ]);
    indexed = true;
  }
  return c;
}

export type IssueResult = { ok: true; code: string } | { ok: false; reason: "too-many" | "busy" };

export async function issueCode(email: string): Promise<IssueResult> {
  const c = await codes();
  const now = Date.now();
  const since = new Date(now - SEND_WINDOW_MS);
  const [mine, all] = await Promise.all([
    c.countDocuments({ email, createdAt: { $gt: since } }),
    c.countDocuments({ createdAt: { $gt: since } }),
  ]);
  if (mine >= MAX_SENDS_PER_ADDRESS) return { ok: false, reason: "too-many" };
  if (all >= MAX_SENDS_TOTAL) return { ok: false, reason: "busy" };

  const code = newCode();
  await c.insertOne({
    email,
    hash: hashCode(email, code, secret()),
    guesses: 0,
    createdAt: new Date(now),
    expiresAt: new Date(now + CODE_TTL_MS),
    purgeAt: new Date(now + Math.max(CODE_TTL_MS, SEND_WINDOW_MS)),
  });
  return { ok: true, code };
}

/** True once, for the right code. After success every code for that address stops working. */
export async function redeemCode(email: string, code: string): Promise<boolean> {
  const c = await codes();
  const latest = await c.findOne({ email }, { sort: { createdAt: -1 } });
  if (!latest || latest.expiresAt.getTime() < Date.now() || latest.guesses >= MAX_GUESSES) return false;

  if (hashesMatch(latest.hash, hashCode(email, code, secret()))) {
    // Spend the code atomically: if two requests race with it, only one wins.
    const won = await c.updateOne({ _id: latest._id, guesses: { $lt: MAX_GUESSES } }, { $set: { guesses: MAX_GUESSES } });
    if (won.modifiedCount !== 1) return false;
    // Burn the older codes too. Keep the documents, so the send rate limit still counts them.
    await c.updateMany({ email }, { $set: { guesses: MAX_GUESSES } });
    return true;
  }
  await c.updateOne({ _id: latest._id }, { $inc: { guesses: 1 } });
  return false;
}
