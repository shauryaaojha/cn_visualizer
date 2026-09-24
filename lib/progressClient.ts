// ---------------------------------------------------------------------------
// progressClient: records lesson progress in the browser and syncs it.
//
// Everything is written to localStorage first, signed in or not, so nothing is
// lost to a closed tab or a bad connection. When signed in, changed lessons
// go to /api/progress a few seconds after the last change, and once more by
// beacon when the page is hidden. The server merges, so sending the same
// thing twice is harmless. Progress made while signed out is still marked as
// unsent, so it reaches the account the first time they sign in.
// ---------------------------------------------------------------------------

import { getMe } from "@/lib/sessionClient";
import { emptyProgress, merge, withAnswer, withFrames, type LessonProgress } from "@/lib/progressModel";

const KEY = "cnv.progress.v1";
const SYNC_DELAY_MS = 4000;

interface Saved {
  entries: Record<string, LessonProgress>;
  /** Lessons changed since the server last confirmed them. */
  unsent: string[];
}

let state: Saved | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let pulled = false;

function load(): Saved {
  if (state) return state;
  state = { entries: {}, unsent: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Saved;
      if (s && typeof s.entries === "object" && Array.isArray(s.unsent)) state = s;
    }
  } catch {
    // Private mode or corrupt data: start empty, still works for this visit.
  }
  return state;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(load()));
  } catch {
    // Storage full or blocked: progress for this visit still syncs if signed in.
  }
}

function update(lesson: string, fn: (p: LessonProgress) => LessonProgress) {
  const s = load();
  const before = s.entries[lesson] ?? emptyProgress(lesson);
  const after = fn(before);
  if (after === before) return;
  s.entries[lesson] = after;
  if (!s.unsent.includes(lesson)) s.unsent.push(lesson);
  save();
  scheduleSync();
}

/** `seen` = distinct frames visited this sitting; `frame` = where they are now. */
export function recordFrames(lesson: string, seen: number, total: number, frame: number) {
  update(lesson, (p) => withFrames(p, seen, total, frame, Date.now()));
}

export function recordAnswer(lesson: string, question: string, right: boolean) {
  update(lesson, (p) => withAnswer(p, question, right, Date.now()));
}

export function localProgress(lesson: string): LessonProgress | undefined {
  return load().entries[lesson];
}

function scheduleSync() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void sync(), SYNC_DELAY_MS);
}

function adopt(items: LessonProgress[]) {
  const s = load();
  for (const i of items) {
    const mine = s.entries[i.lesson];
    s.entries[i.lesson] = mine ? merge(mine, i) : i;
  }
  save();
}

/**
 * Sends unsent lessons, and on the first call also pulls what other devices
 * saved. Resolves true if the server received anything new.
 */
export async function sync(): Promise<boolean> {
  if (timer) clearTimeout(timer);
  timer = null;
  const me = await getMe();
  if (!me) return false; // signed out: keep everything local and unsent

  if (!pulled) {
    pulled = true;
    const r = await fetch("/api/progress").catch(() => null);
    if (r?.ok) adopt(((await r.json()) as { items: LessonProgress[] }).items);
  }

  const s = load();
  if (s.unsent.length === 0) return false;
  const sending = s.unsent.slice(0, 200);
  const stamps = new Map(sending.map((l) => [l, s.entries[l]?.updatedAt ?? 0]));
  const r = await fetch("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: sending.map((l) => s.entries[l]).filter(Boolean) }),
  }).catch(() => null);
  if (!r?.ok) return false; // try again after the next change

  const saved = ((await r.json()) as { items: LessonProgress[] }).items;
  adopt(saved);
  // Only what the server returned is confirmed. A lesson it refused (e.g. one
  // since removed from the course) is dropped, and anything that changed
  // while the request was in flight stays unsent.
  const confirmed = new Set(saved.map((i) => i.lesson));
  s.unsent = s.unsent.filter((l) => {
    if (!stamps.has(l)) return true;
    if (!confirmed.has(l)) return false;
    return (s.entries[l]?.updatedAt ?? 0) > stamps.get(l)!;
  });
  save();
  if (s.unsent.length) scheduleSync();
  return true;
}

/** Last chance when the tab is hidden or closed: fire-and-forget, no response needed. */
export function flush() {
  const s = load();
  if (s.unsent.length === 0 || typeof navigator === "undefined" || !navigator.sendBeacon) return;
  void getMe().then((me) => {
    if (!me) return;
    const items = s.unsent.slice(0, 200).map((l) => s.entries[l]).filter(Boolean);
    navigator.sendBeacon("/api/progress", JSON.stringify({ items }));
  });
}
