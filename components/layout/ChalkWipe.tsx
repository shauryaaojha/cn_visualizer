"use client";

// Adapted from Animmaster: Page Transitions/5 (SVG stroke wipe)
//
// Moving between topics wipes the board: two fat eraser strokes scrub across
// the screen, the next page is written underneath, and the strokes clear off.
//
// Changes from the demo:
// - GSAP → Web Animations API. stroke-dashoffset and stroke-width are plain CSS
//   properties on SVG, so the browser can animate them without a library.
// - 1s + 1s → 0.42s + 0.42s. A student jumping between topics should feel a
//   beat, not wait through a cutscene.
// - Hash routing → the App Router. Internal <a> clicks are intercepted in the
//   capture phase, the cover plays, then router.push; the reveal waits for the
//   new pathname so the board never uncovers a half-loaded page.
// - Skipped entirely in record mode (a lesson take must not flash), under
//   prefers-reduced-motion, and for modified clicks / new tabs / same page.

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { normalizePath } from "@/data/curriculum";
import { useRecordStore } from "@/lib/recordStore";

const COVER_MS = 420;
const REVEAL_MS = 420;
/** If navigation stalls, uncover anyway rather than trap the user. */
const SAFETY_MS = 4000;

const PATHS = [
  "M227.549 1818.76C227.549 1818.76 406.016 2207.75 569.049 2130.26C843.431 1999.85 -264.104 1002.3 227.549 876.262C552.918 792.849 773.647 2456.11 1342.05 2130.26C1885.43 1818.76 14.9644 455.772 760.548 137.262C1342.05 -111.152 1663.5 2266.35 2209.55 1972.76C2755.6 1679.18 1536.63 384.467 1826.55 137.262C2013.5 -22.1463 2209.55 381.262 2209.55 381.262",
  "M1661.28 2255.51C1661.28 2255.51 2311.09 1960.37 2111.78 1817.01C1944.47 1696.67 718.456 2870.17 499.781 2255.51C308.969 1719.17 2457.51 1613.83 2111.78 963.512C1766.05 313.198 427.949 2195.17 132.281 1455.51C-155.219 736.292 2014.78 891.514 1708.78 252.012C1437.81 -314.29 369.471 909.169 132.281 566.512C18.1772 401.672 244.781 193.012 244.781 193.012",
];
// Eraser-dark first, then the lighter smear it leaves behind.
const STROKES = ["#12291F", "#26503F"];

type Phase = "idle" | "covering" | "covered" | "revealing";

export function ChalkWipe() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const phase = useRef<Phase>("idle");
  const target = useRef<string | null>(null);
  const safety = useRef<number | undefined>(undefined);

  // Navigation must never hinge on an animation finishing: a background tab
  // or a throttled compositor can stall `finished` indefinitely. Whichever
  // comes first — the strokes or the clock — wins.
  const run = (to: "cover" | "reveal") =>
    Promise.race([
      animateStrokes(to),
      new Promise<void>((r) => window.setTimeout(r, (to === "cover" ? COVER_MS : REVEAL_MS) + 120)),
    ]);

  const animateStrokes = (to: "cover" | "reveal") =>
    Promise.all(
      pathRefs.current.map((p) => {
        if (!p) return Promise.resolve();
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        const frames =
          to === "cover"
            ? [
                { strokeDashoffset: `${len}`, strokeWidth: "200" },
                { strokeDashoffset: "0", strokeWidth: "700" },
              ]
            : [
                { strokeDashoffset: "0", strokeWidth: "700" },
                { strokeDashoffset: `${-len}`, strokeWidth: "200" },
              ];
        const a = p.animate(frames, {
          duration: to === "cover" ? COVER_MS : REVEAL_MS,
          easing: "cubic-bezier(0.65, 0, 0.35, 1)",
          fill: "forwards",
        });
        return a.finished.then(() => undefined);
      }),
    ).then(() => undefined);

  const reveal = () => {
    window.clearTimeout(safety.current);
    if (phase.current !== "covered") return;
    phase.current = "revealing";
    run("reveal").then(() => {
      phase.current = "idle";
      pathRefs.current.forEach((p) => p?.getAnimations().forEach((a) => a.cancel()));
      pathRefs.current.forEach((p) => p && (p.style.strokeDashoffset = `${p.getTotalLength()}`));
    });
  };

  // Start hidden: every stroke fully "undrawn".
  useEffect(() => {
    pathRefs.current.forEach((p) => {
      if (!p) return;
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = `${len}`;
    });
  }, []);

  // New page is on screen → clear the board.
  useEffect(() => {
    if (phase.current === "covered" && target.current === normalizePath(pathname)) reveal();
    // reveal is stable enough for this purpose; re-running on it would loop.
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

      e.preventDefault();
      e.stopPropagation();
      phase.current = "covering";
      target.current = next;
      run("cover").then(() => {
        phase.current = "covered";
        router.push(url.pathname + url.search + url.hash);
        safety.current = window.setTimeout(reveal, SAFETY_MS);
      });
    };
    // Capture phase, so this runs before next/link's own click handler.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-1/2 top-1/2 z-[200] h-full w-full"
      style={{ transform: "translate(-50%, -50%) scale(1.5)" }}
    >
      <svg viewBox="0 0 2453 2535" fill="none" preserveAspectRatio="none" className="h-full w-full">
        {PATHS.map((d, i) => (
          <path
            key={i}
            ref={(el) => {
              pathRefs.current[i] = el;
            }}
            d={d}
            stroke={STROKES[i]}
            strokeWidth={200}
            strokeLinecap="round"
          />
        ))}
      </svg>
    </div>
  );
}
