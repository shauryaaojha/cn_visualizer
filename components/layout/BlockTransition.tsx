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
// - Look: the demo's own — blocks pop on in fully random order (60ms each,
//   spread over 420ms). A smoother eased wave was tried and rejected; the
//   crisp random pop is the intended style. Drawn at device pixel ratio.
// - No dead air under the grid. The wait between "covered" and "revealed" is
//   just the route loading, so every internal link is prefetched the moment
//   the pointer reaches it (hover, focus or press). By the time the cover
//   finishes, the next page is usually already in memory and the swap is
//   one frame; the reveal starts on the very next frame after it mounts.
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
/** Each block's own ease-in (demo: a 0.05s pop). */
const FADE_MS = 60;
const HOLD_MS = 0;
/** How much of each block's start time is random rather than distance. */
const JITTER = 1;
const easeOut = (t: number) => t;
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
  /** Per-block start offset in ms: a wave from the origin, with jitter. */
  start: Float32Array;
}

interface Point {
  x: number;
  y: number;
}

export function BlockTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phase = useRef<Phase>("idle");
  const target = useRef<string | null>(null);
  const safety = useRef<number | undefined>(undefined);
  const raf = useRef(0);
  /** Bumped by every run; an older run that sees a newer number stops drawing. */
  const gen = useRef(0);

  const makeGrid = (origin?: Point): Grid | null => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return null;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cols = Math.ceil(w / BLOCK);
    const rows = Math.ceil(h / BLOCK) + 1;
    const ox = (w - cols * BLOCK) / 2;
    const oy = (h - rows * BLOCK) / 2;
    const o = origin ?? { x: w / 2, y: h / 2 };
    const start = new Float32Array(cols * rows);
    let far = 1;
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const d = Math.hypot(ox + (col + 0.5) * BLOCK - o.x, oy + (r + 0.5) * BLOCK - o.y);
        start[r * cols + col] = d;
        far = Math.max(far, d);
      }
    }
    for (let i = 0; i < start.length; i++) {
      start[i] = ((start[i] / far) * (1 - JITTER) + Math.random() * JITTER) * SPREAD_MS;
    }
    return { cols, rows, ox, oy, start };
  };

  const paint = (g: Grid, elapsed: number, dir: "in" | "out") => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let r = 0; r < g.rows; r++) {
      for (let c = 0; c < g.cols; c++) {
        const i = r * g.cols + c;
        const k = easeOut(Math.min(Math.max((elapsed - g.start[i]) / FADE_MS, 0), 1));
        const a = dir === "in" ? k : 1 - k;
        if (a <= 0.001) continue;
        // Grow from 40% on the way in; shrink back on the way out.
        const size = BLOCK;
        const x = g.ox + c * BLOCK + (BLOCK - size) / 2;
        const y = g.oy + r * BLOCK + (BLOCK - size) / 2;
        ctx.globalAlpha = a;
        ctx.fillStyle = BLOCK_FILL;
        // +0.5 overlaps neighbours so a fully covered screen has no hairline seams.
        ctx.fillRect(x, y, size + 0.5, size + 0.5);
        if (a > 0.98) {
          ctx.fillStyle = "rgba(243,241,231,0.045)";
          ctx.fillRect(x, y, size, 1);
          ctx.fillRect(x, y, 1, size);
        }
      }
    }
    ctx.globalAlpha = 1;
  };

  // Resolves when the animation ends or its timer runs out, whichever is first
  // — or at `early` ms, if given, while the animation carries on to the end.
  const run = (dir: "in" | "out", g: Grid, delay = 0, early?: number) =>
    new Promise<void>((resolve) => {
      const total = SPREAD_MS + FADE_MS;
      const mine = ++gen.current;
      let done = false;
      let told = false;
      const tell = () => {
        if (told) return;
        told = true;
        resolve();
      };
      const finish = () => {
        if (done) return;
        done = true;
        // Superseded (the reveal started while this cover was still easing):
        // stop without painting over the newer run.
        if (mine !== gen.current) return tell();
        cancelAnimationFrame(raf.current);
        paint(g, Infinity, dir);
        tell();
      };
      const t0 = performance.now() + delay;
      // Each tick is scheduled on BOTH an animation frame and a ~30fps timer;
      // whichever fires first draws, and cancels the other. In a normal tab
      // that is simply rAF. When the compositor throttles frames (a busy
      // navigation, a background pane) the timer keeps the wave moving
      // instead of the whole reveal snapping shut at the end.
      let timer = 0;
      const frame = () => {
        window.clearTimeout(timer);
        if (done) return;
        if (mine !== gen.current) return finish();
        cancelAnimationFrame(raf.current);
        const elapsed = performance.now() - t0;
        if (elapsed >= total) return finish();
        if (early !== undefined && elapsed >= early) tell();
        if (elapsed >= 0) paint(g, elapsed, dir);
        raf.current = requestAnimationFrame(frame);
        timer = window.setTimeout(frame, 34);
      };
      frame();
      window.setTimeout(finish, delay + total + 400);
    });

  const grid = useRef<Grid | null>(null);

  const reveal = () => {
    window.clearTimeout(safety.current);
    if (phase.current !== "covered" || !grid.current) return;
    phase.current = "revealing";
    // A fresh wave from the centre, so the blocks leave differently than they came.
    const g = makeGrid();
    if (!g) return;
    paint(g, Infinity, "in");
    // One frame for the new page to paint before it is uncovered — or 40ms,
    // whichever is first, because a throttled tab may not run frames.
    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      run("out", g, HOLD_MS).then(() => {
        phase.current = "idle";
        grid.current = null;
      });
    };
    requestAnimationFrame(go);
    window.setTimeout(go, 40);
  };

  // New page is on screen → lift the grid.
  useEffect(() => {
    if (phase.current === "covered" && target.current === normalizePath(pathname)) reveal();
    // reveal only reads refs; re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Prefetch on intent: hovering, focusing or pressing an internal link starts
  // loading its route, so the grid never has to wait on the network.
  useEffect(() => {
    const seen = new Set<string>();
    const warm = (e: Event) => {
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank") return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || seen.has(url.pathname)) return;
      seen.add(url.pathname);
      router.prefetch(url.pathname);
    };
    document.addEventListener("pointerover", warm, { passive: true });
    document.addEventListener("pointerdown", warm, { passive: true, capture: true });
    document.addEventListener("focusin", warm);
    return () => {
      document.removeEventListener("pointerover", warm);
      document.removeEventListener("pointerdown", warm, { capture: true });
      document.removeEventListener("focusin", warm);
    };
  }, [router]);

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
      const g = makeGrid({ x: e.clientX, y: e.clientY });
      if (!g) return;

      e.preventDefault();
      e.stopPropagation();
      router.prefetch(url.pathname);
      phase.current = "covering";
      target.current = next;
      grid.current = g;
      // Start the route swap once the last blocks are ~85% opaque rather than
      // waiting out their final ease — the tail of the cover and the swap
      // overlap, so there is no fully-covered pause before the new page.
      run("in", g, 0, SPREAD_MS + FADE_MS * 0.45).then(() => {
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
