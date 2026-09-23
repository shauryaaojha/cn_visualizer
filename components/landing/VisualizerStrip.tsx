"use client";

// Adapted from Animmaster: Sliders/6 (infinite drag slider with parallax)
//
// Every visualizer that runs today, on one endless strip. Drag it, flick it,
// or scroll sideways; the icon inside each card drifts against the motion so
// the strip has depth.
//
// What changed from the demo:
// - It no longer hijacks the vertical wheel. The demo called preventDefault
//   on every wheel event, which traps anyone scrolling down the landing page.
//   Only horizontal wheel / trackpad swipes (or Shift+wheel) move the strip.
// - Pointer events instead of separate mouse/touch paths; a drag past 6px
//   cancels the click so you never open a topic by accident. That check runs
//   on window in the capture phase — ahead of ChalkWipe's document-level
//   listener, which would otherwise start a page transition mid-drag.
// - The rAF loop sleeps when the strip is at rest instead of running forever,
//   and it only runs while the strip is on screen.
// - Cards are real links: Tab walks them and the strip scrolls the focused
//   card to the centre. Arrow keys nudge it when the strip has focus.
// - Photos → each topic's own icon, unit and category, from curriculum.ts.
// - prefers-reduced-motion: no easing trail and no parallax.

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import type { LeafRef } from "@/data/curriculum";

const LERP = 0.08;
const GAP = 20;
const COPIES = 3;

interface StripItem extends LeafRef {
  unitLabel: string;
  categoryTitle: string;
}

export function VisualizerStrip({ items }: { items: StripItem[] }) {
  const viewport = useRef<HTMLDivElement | null>(null);
  const track = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const vp = viewport.current;
    const tr = track.current;
    if (!vp || !tr || items.length === 0) return;
    const slides = Array.from(tr.children) as HTMLElement[];
    const icons = slides.map((s) => s.querySelector<HTMLElement>("[data-parallax]"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let slideW = slides[0].offsetWidth + GAP;
    let seq = slideW * items.length;
    // Start on the middle copy (room to drag both ways), with the first card
    // lined up under the section heading rather than jammed against the edge.
    const inset = () => Math.max(24, (vp.clientWidth - 1152) / 2 + 24);
    let current = -seq + inset();
    let target = current;
    let raf = 0;
    let onScreen = false;

    const wrap = () => {
      if (current > -seq * 0.5) {
        current -= seq;
        target -= seq;
      } else if (current < -seq * 1.5) {
        current += seq;
        target += seq;
      }
    };

    const paint = () => {
      tr.style.transform = `translate3d(${current}px,0,0)`;
      if (reduce) return;
      const left = vp.getBoundingClientRect().left;
      const mid = left + vp.clientWidth / 2;
      slides.forEach((s, i) => {
        const x = left + s.offsetLeft + current + s.offsetWidth / 2;
        if (x < -400 || x > window.innerWidth + 400) return;
        const icon = icons[i];
        if (icon) icon.style.transform = `translate3d(${(x - mid) * -0.08}px,0,0)`;
      });
    };

    const tick = () => {
      current += (target - current) * (reduce ? 1 : LERP);
      wrap();
      paint();
      if (Math.abs(target - current) > 0.2 || dragging) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    const wake = () => {
      if (!raf && onScreen) raf = requestAnimationFrame(tick);
    };

    // --- drag (listeners on window so a fast flick can leave the strip) ---
    let dragging = false;
    let lastX = 0;
    let moved = 0;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging = true;
      moved = 0;
      lastX = e.clientX;
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      wake();
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      moved += Math.abs(dx);
      target += dx * 1.4;
      wake();
    };
    const onUp = () => {
      dragging = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      wake();
    };
    const onClick = (e: MouseEvent) => {
      if (!vp.contains(e.target as Node)) return;
      if (moved > 6) {
        moved = 0;
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // --- wheel: sideways only ---
    const onWheel = (e: WheelEvent) => {
      const dx = e.shiftKey ? e.deltaY : e.deltaX;
      if (Math.abs(dx) <= Math.abs(e.shiftKey ? e.deltaX : e.deltaY)) return;
      e.preventDefault();
      target -= Math.max(-150, Math.min(150, dx * 1.5));
      wake();
    };

    // --- keyboard ---
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      target += e.key === "ArrowLeft" ? slideW : -slideW;
      wake();
    };
    const onFocus = (e: FocusEvent) => {
      const s = (e.target as Element).closest<HTMLElement>("[data-slide]");
      if (!s) return;
      target = -(s.offsetLeft + s.offsetWidth / 2 - vp.clientWidth / 2);
      wake();
    };

    const measure = () => {
      slideW = slides[0].offsetWidth + GAP;
      const nextSeq = slideW * items.length;
      current = (current / seq) * nextSeq;
      target = current;
      seq = nextSeq;
      paint();
    };

    const io = new IntersectionObserver(([en]) => {
      onScreen = en.isIntersecting;
      if (onScreen) wake();
    });
    io.observe(vp);
    const ro = new ResizeObserver(measure);
    ro.observe(vp);

    vp.addEventListener("pointerdown", onDown);
    window.addEventListener("click", onClick, true);
    vp.addEventListener("wheel", onWheel, { passive: false });
    vp.addEventListener("keydown", onKey);
    vp.addEventListener("focusin", onFocus);
    paint();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      vp.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("click", onClick, true);
      vp.removeEventListener("wheel", onWheel);
      vp.removeEventListener("keydown", onKey);
      vp.removeEventListener("focusin", onFocus);
    };
  }, [items]);

  const loop = Array.from({ length: COPIES }, (_, c) => items.map((it) => ({ it, c }))).flat();

  return (
    <div
      ref={viewport}
      role="region"
      aria-roledescription="carousel"
      aria-label="All visualizers"
      className="relative cursor-grab touch-pan-y select-none overflow-hidden py-2 active:cursor-grabbing"
    >
      <div ref={track} className="flex w-max will-change-transform" style={{ gap: GAP }}>
        {loop.map(({ it, c }) => (
          <Link
            key={`${c}-${it.href}`}
            href={it.href}
            data-slide
            draggable={false}
            tabIndex={c === 1 ? 0 : -1}
            aria-hidden={c === 1 ? undefined : true}
            className="group relative flex h-[340px] w-[260px] shrink-0 flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low p-5 transition-colors duration-200 hover:border-primary/70 md:w-[300px]"
          >
            <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-md bg-surface-dim">
              <span data-parallax className="block will-change-transform">
                <Icon
                  name={it.icon}
                  className="!text-[96px] text-on-surface/80 transition-colors duration-200 group-hover:text-primary"
                />
              </span>
            </div>
            <p className="mt-4 font-label-caps text-label-caps uppercase text-on-surface-variant">
              {it.unitLabel} · {it.categoryTitle}
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <h3 className="font-hand text-[22px] font-bold leading-tight text-on-surface">{it.title}</h3>
              <Icon
                name="east"
                className="text-[18px] text-on-surface-variant transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
