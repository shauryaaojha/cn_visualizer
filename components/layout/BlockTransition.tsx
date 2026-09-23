"use client";

// Adapted from Animmaster: Page Transitions/12 (random block reveal)
//
// Moving between topics fills the screen with a grid of cells, one at a time
// in random order — like a frame being assembled out of packets — then the
// cells drop out at random to reveal the next page.
//
// Changes from the demo:
// - next-transition-router + GSAP → no dependencies. The demo created one
//   <div> per block (~400 at 1440×900) and tweened each with GSAP; here the
//   grid is painted on a single canvas, a few hundred fillRects per frame.
// - Internal <a> clicks are intercepted in the capture phase, the cover plays,
//   then router.push; the reveal waits for the new pathname so the grid never
//   lifts off a half-loaded page. A timer backs up every animation, so a
//   throttled tab can never strand you behind the grid.
// - Timing: ~0.45s in, a short hold, ~0.45s out (the demo held 0.3s).
// - Blocks are board-green with a faint chalk grid line, not flat black.
// - Skipped in record mode (a lesson take must not flash), under
//   prefers-reduced-motion, and for modified clicks / new tabs / same page.

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { normalizePath } from "@/data/curriculum";
import { useRecordStore } from "@/lib/recordStore";

const BLOCK = 60;
/** Time over which block start times are spread (demo: stagger amount 0.5s). */
const SPREAD_MS = 420;
/** Each block's own fade (demo: duration 0.05s). */
const FADE_MS = 60;
const HOLD_MS = 90;
/** Deeper than any board surface, so the grid reads clearly over the page. */
const BLOCK_FILL = "#132C22";
/** If navigation stalls, uncover anyway rather than trap the user. */
const SAFETY_MS = 4000;

type Phase = "idle" | "covering" | "covered" | "revealing";

interface Grid {
  cols: number;
  rows: number;
  ox: number;
  oy: number;
  /** Per-block start offset in ms, shuffled so blocks arrive at random. */
  start: Float32Array;
}

export function BlockTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phase = useRef<Phase>("idle");
  const target = useRef<string | null>(null);
  const safety = useRef<number | undefined>(undefined);
  const raf = useRef(0);

  const makeGrid = (): Grid | null => {
    const c = canvasRef.current;
    if (!c) return null;
    const w = window.innerWidth;
    const h = window.innerHeight;
    c.width = w;
    c.height = h;
    const cols = Math.ceil(w / BLOCK);
    const rows = Math.ceil(h / BLOCK) + 1;
    const n = cols * rows;
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const start = new Float32Array(n);
    order.forEach((blockIndex, rank) => (start[blockIndex] = (rank / n) * SPREAD_MS));
    return { cols, rows, ox: (w - cols * BLOCK) / 2, oy: (h - rows * BLOCK) / 2, start };
  };

  const paint = (g: Grid, elapsed: number, dir: "in" | "out") => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (let r = 0; r < g.rows; r++) {
      for (let c = 0; c < g.cols; c++) {
        const i = r * g.cols + c;
        const k = Math.min(Math.max((elapsed - g.start[i]) / FADE_MS, 0), 1);
        const a = dir === "in" ? k : 1 - k;
        if (a <= 0) continue;
        const x = g.ox + c * BLOCK;
        const y = g.oy + r * BLOCK;
        ctx.globalAlpha = a;
        ctx.fillStyle = BLOCK_FILL;
        ctx.fillRect(x, y, BLOCK, BLOCK);
        ctx.fillStyle = "rgba(243,241,231,0.05)";
        ctx.fillRect(x, y, BLOCK, 1);
        ctx.fillRect(x, y, 1, BLOCK);
      }
    }
    ctx.globalAlpha = 1;
  };

  // Resolves when the animation ends or its timer runs out, whichever is first.
  const run = (dir: "in" | "out", g: Grid, delay = 0) =>
    new Promise<void>((resolve) => {
      const total = SPREAD_MS + FADE_MS;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf.current);
        paint(g, Infinity, dir);
        resolve();
      };
      const t0 = performance.now() + delay;
      const frame = (now: number) => {
        const elapsed = now - t0;
        if (elapsed >= total) return finish();
        if (elapsed >= 0) paint(g, elapsed, dir);
        raf.current = requestAnimationFrame(frame);
      };
      raf.current = requestAnimationFrame(frame);
      window.setTimeout(finish, delay + total + 150);
    });

  const grid = useRef<Grid | null>(null);

  const reveal = () => {
    window.clearTimeout(safety.current);
    if (phase.current !== "covered" || !grid.current) return;
    phase.current = "revealing";
    // Reshuffle so the blocks leave in a different order than they came.
    const g = makeGrid();
    if (!g) return;
    paint(g, Infinity, "in");
    run("out", g, HOLD_MS).then(() => {
      phase.current = "idle";
      grid.current = null;
    });
  };

  // New page is on screen → lift the grid.
  useEffect(() => {
    if (phase.current === "covered" && target.current === normalizePath(pathname)) reveal();
    // reveal only reads refs; re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const next = normalizePath(url.pathname);
      if (next === normalizePath(window.location.pathname)) return;
      if (phase.current !== "idle") {
        e.preventDefault();
        return;
      }
      if (useRecordStore.getState().on) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const g = makeGrid();
      if (!g) return;

      e.preventDefault();
      e.stopPropagation();
      phase.current = "covering";
      target.current = next;
      grid.current = g;
      run("in", g).then(() => {
        phase.current = "covered";
        router.push(url.pathname + url.search + url.hash);
        safety.current = window.setTimeout(reveal, SAFETY_MS);
      });
    };
    // Capture phase, so this runs before next/link's own click handler.
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[200] h-full w-full" />;
}
