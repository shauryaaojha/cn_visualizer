"use client";

// One scroll-driven "how it works" section per unit, in the same shape as the
// Unit 1 OsiStack: a readable step list on the left, an animation on the
// right, and the page's own scroll moving you through the steps.
//
// Each unit only supplies its steps and a visual that draws step `active`.
// The visual animates between discrete steps (springs, path drawing) rather
// than being scrubbed pixel-by-pixel, so every intermediate frame is a
// correct diagram — a half-scrolled network never shows a half-drawn table.

import { useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import Link from "next/link";
import { useRef, useState, type ReactNode, type RefObject } from "react";
import { Icon } from "@/components/ui/Icon";

export interface ShowStep {
  /** Short tag on the right of the list row — "/26", "SYN", "cost 7". */
  tag: string;
  title: string;
  /** One or two sentences shown for the active step. */
  detail: string;
}

interface ScrollShowcaseProps {
  scroller: RefObject<HTMLElement | null>;
  eyebrow: string;
  title: string;
  blurb: string;
  steps: ShowStep[];
  href: string;
  cta: string;
  /** Draws the animation for the given step. */
  visual: (active: number, reduce: boolean) => ReactNode;
}

export function ScrollShowcase({ scroller, eyebrow, title, blurb, steps, href, cta, visual }: ScrollShowcaseProps) {
  const reduce = useReducedMotion() ?? false;
  const section = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ container: scroller, target: section, offset: ["start start", "end end"] });
  const n = steps.length;
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const i = Math.min(n - 1, Math.max(0, Math.floor(((p - 0.03) / 0.9) * n)));
    setActive((v) => (v === i ? v : i));
  });
  const shown = reduce ? n - 1 : active;
  const step = steps[shown];

  return (
    <section ref={section} className={reduce ? "" : "relative"} style={reduce ? undefined : { height: `${n * 75 + 60}vh` }}>
      <div
        className={`${reduce ? "" : "sticky top-0 h-[calc(100dvh-64px)]"} mx-auto grid w-full max-w-6xl items-center gap-8 px-margin py-12 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]`}
      >
        <div className="order-2 md:order-1">
          <p className="mb-2 font-label-caps text-label-caps uppercase text-primary">{eyebrow}</p>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">{title}</h2>
          <p className="mt-2 max-w-md font-body-md text-body-md text-on-surface-variant">{blurb}</p>

          <ol className="mt-6 flex flex-col gap-1">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className={`flex items-baseline gap-3 rounded-md px-3 py-1.5 transition-[opacity,background-color] duration-300 ${
                  i === shown ? "bg-surface-container-high" : ""
                } ${i <= shown ? "opacity-100" : "opacity-35"}`}
              >
                <span className="w-5 font-mono text-[13px] text-primary">{i + 1}</span>
                <span className="font-hand text-[20px] font-bold text-on-surface">{s.title}</span>
                <span className="ml-auto font-mono text-[13px] text-on-surface-variant">{s.tag}</span>
              </li>
            ))}
          </ol>

          <p aria-live="polite" className="mt-5 min-h-[48px] max-w-md font-sans text-[15px] leading-relaxed text-on-surface-variant">
            {step.detail}
          </p>

          <Link
            href={href}
            className="group mt-4 inline-flex items-center gap-2 rounded-md border border-primary px-4 py-2.5 font-sans text-[15px] font-bold text-primary transition-colors hover:bg-primary hover:text-surface"
          >
            {cta}
            <Icon name="east" className="text-[18px] transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div aria-hidden className="order-1 flex items-center justify-center md:order-2">
          <div className="origin-center scale-[0.72] md:scale-100">{visual(shown, reduce)}</div>
        </div>
      </div>
    </section>
  );
}
