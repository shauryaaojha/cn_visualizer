"use client";

// The visitor's own progress for prerendered pages such as the landing page.
// Signed in: sync first (which pulls the account's progress from other
// devices), then read. Signed out: whatever this browser has saved.

import { useEffect, useState } from "react";
import { allProgress, sync } from "@/lib/progressClient";
import { getMe } from "@/lib/sessionClient";
import type { LessonProgress } from "@/lib/progressModel";

export interface MyProgress {
  /** "account" = signed in; "local" = signed out but this browser has progress. */
  source: "account" | "local";
  name?: string | null;
  items: LessonProgress[];
}

/** null while loading, or when there is nothing personal to show. */
export function useMyProgress(): MyProgress | null {
  const [mine, setMine] = useState<MyProgress | null>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      const me = await getMe();
      if (me) await sync();
      const items = allProgress().filter((p) => p.best > 0 || p.completed || Object.keys(p.answers).length > 0);
      if (!live) return;
      if (me) setMine({ source: "account", name: me.name, items });
      else if (items.length) setMine({ source: "local", items });
    })();
    return () => {
      live = false;
    };
  }, []);
  return mine;
}
