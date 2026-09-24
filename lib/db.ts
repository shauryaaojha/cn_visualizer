import "server-only";
import { MongoClient, type Db } from "mongodb";

// One MongoClient per server instance. Vercel reuses a warm function between
// requests, and `next dev` re-evaluates modules on every edit — caching the
// connect promise on globalThis stops both from opening a new pool each time.
// Nothing connects until the first query, so builds need no MONGODB_URI.

const globalForMongo = globalThis as unknown as { _mongo?: Promise<MongoClient> };

function client(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Add it to .env.local (dev) or the Vercel project env vars.");
  globalForMongo._mongo ??= new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 }).connect().catch((err) => {
    // Don't cache a failed connection — the next request should retry.
    globalForMongo._mongo = undefined;
    throw err;
  });
  return globalForMongo._mongo;
}

let indexed = false;

export async function db(): Promise<Db> {
  const d = (await client()).db(process.env.MONGODB_DB || "cn_visualizer");
  if (!indexed) {
    await d.collection("users").createIndex({ email: 1 }, { unique: true });
    indexed = true;
  }
  return d;
}
