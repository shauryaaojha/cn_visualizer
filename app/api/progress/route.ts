import { auth } from "@/auth";
import { MAX_ITEMS_PER_SYNC, sanitize, type LessonProgress } from "@/lib/progressModel";
import { getProgress, LESSONS, saveProgress } from "@/lib/progressStore";
import { getUser } from "@/lib/users";

// GET  → the signed-in user's progress on every lesson.
// POST → { items: LessonProgress[] }. Each item is merged with the stored copy,
//        and the merged copies come back so the browser can adopt them.
// Signed out → 401. The browser keeps progress locally until they sign in.

/** The signed-in user's id, only if that user still exists. A cookie can outlive its account. */
async function userId(): Promise<string | null> {
  const id = (await auth())?.user?.id;
  return id && (await getUser(id)) ? id : null;
}

export async function GET() {
  const uid = await userId();
  if (!uid) return Response.json({ error: "signed-out" }, { status: 401 });
  return Response.json({ items: await getProgress(uid) });
}

export async function POST(req: Request) {
  // The body is text/plain (sendBeacon), which a form on another site could also
  // send with the student's cookie. Only accept writes from pages on this site.
  const origin = req.headers.get("origin");
  if (origin && URL.parse(origin)?.host !== new URL(req.url).host) {
    return Response.json({ error: "cross-site" }, { status: 403 });
  }
  const uid = await userId();
  if (!uid) return Response.json({ error: "signed-out" }, { status: 401 });

  let body: unknown;
  try {
    // sendBeacon posts text/plain, so read the text and parse it ourselves.
    const text = await req.text();
    if (text.length > 256_000) return Response.json({ error: "too-large" }, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "bad-json" }, { status: 400 });
  }
  const raw = (body as { items?: unknown })?.items;
  if (!Array.isArray(raw)) return Response.json({ error: "no-items" }, { status: 400 });

  const now = Date.now();
  const items = raw
    .slice(0, MAX_ITEMS_PER_SYNC)
    .map((r) => sanitize(r, (p) => LESSONS.has(p), now))
    .filter((x): x is LessonProgress => x !== null);

  return Response.json({ items: await saveProgress(uid, items) });
}
