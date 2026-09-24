import { db } from "@/lib/db";

// GET /api/health: is the deployment wired up? It reports which pieces are
// configured and whether MongoDB answers a ping. It never echoes a value or a
// raw error message, because those can carry the cluster host or username.

export const dynamic = "force-dynamic";

function reason(err: unknown): string {
  const e = err as { name?: string; code?: number | string; message?: string };
  const name = e?.name ?? "Error";
  const msg = e?.message ?? String(err);
  if (/MONGODB_URI is not set/.test(msg)) return "MONGODB_URI missing";
  // 18 = AuthenticationFailed, 8000 = Atlas "bad auth".
  if (e.code === 18 || e.code === 8000 || /bad auth|Authentication failed/i.test(msg))
    return `${name}: authentication failed — check the database user's username/password in MONGODB_URI`;
  if (name === "MongoParseError" || /Invalid scheme|querySrv|ENOTFOUND/i.test(msg))
    return `${name}: the connection string or cluster host looks wrong`;
  if (name === "MongoServerSelectionError" || /timed out/i.test(msg))
    return `${name}: could not reach the cluster — allow 0.0.0.0/0 in Atlas → Network Access`;
  return `${name}: could not connect`;
}

export async function GET() {
  const env = process.env;
  const config = {
    authSecret: Boolean(env.AUTH_SECRET),
    google: Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET),
    github: Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET),
    facultyList: Boolean(env.FACULTY_EMAILS?.trim()),
    mongoUri: Boolean(env.MONGODB_URI),
  };

  let mongo: { ok: boolean; ms?: number; reason?: string };
  const t0 = Date.now();
  try {
    await (await db()).command({ ping: 1 });
    mongo = { ok: true, ms: Date.now() - t0 };
  } catch (err) {
    mongo = { ok: false, reason: reason(err) };
  }

  return Response.json({ config, mongo }, { status: mongo.ok ? 200 : 503 });
}
