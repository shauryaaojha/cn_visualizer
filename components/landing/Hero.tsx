"use client";

// Adapted from Animmaster: Hero Animations/7 (masked character reveal + capsule progress)
//
// The title is written onto the board a character at a time, each letter
// rising out of its own mask; the three claims under it follow line by line.
//
// What changed from the demo:
// - The preloader is gone. It existed to cover a 3.5s fake load; this site is
//   static and offline, so a preloader would only stand between a student and
//   the lesson.
// - Its capsule progress bar survives as something honest: how much of the
//   syllabus is actually built, filled in three steps from real curriculum
//   data instead of a random counter.
// - GSAP → framer-motion; the timings are shortened (the reveal finishes in
//   ~1.2s, not ~6s) and prefers-reduced-motion shows everything at rest.
// - Smoke video and photo backdrop → the ChalkField shader behind it.

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ChalkField } from "@/components/landing/ChalkField";
import { Icon } from "@/components/ui/Icon";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

interface HeroProps {
  built: number;
  total: number;
}

export function Hero({ built, total }: HeroProps) {
  const reduce = useReducedMotion();
  const d = (s: number) => (reduce ? 0 : s);
  const title = "CN_Visualizer";
  const claims = ["Packets move.", "Algorithms step.", "Networks break."];
  const fill = total ? built / total : 0;

  return (
    <section className="relative isolate flex min-h-[calc(100dvh-64px)] flex-col justify-end overflow-hidden">
      <ChalkField className="absolute inset-0 -z-10" />
      {/* Keep the copy legible: the dust thins out behind the words. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(90deg, rgba(36,80,63,0.92) 0%, rgba(36,80,63,0.55) 45%, rgba(36,80,63,0) 75%), linear-gradient(0deg, #24503F 0%, rgba(36,80,63,0) 35%)",
        }}
      />

      <div className="mx-auto w-full max-w-6xl px-margin pb-16 pt-24 md:pb-24">
        <motion.p
          className="mb-5 flex items-center gap-2 font-label-caps text-label-caps uppercase text-primary"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: d(0.5), ease: EASE_OUT }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          21CSC302J · Computer Networks
        </motion.p>

        <h1
          aria-label={title}
          className="font-hand text-[clamp(56px,10vw,136px)] font-bold leading-[0.95] tracking-[-0.02em] text-on-surface"
        >
          {[...title].map((ch, i) => (
            <span key={i} aria-hidden className="-my-[0.15em] inline-block overflow-hidden py-[0.15em] align-bottom">
              <motion.span
                className="inline-block"
                initial={{ y: reduce ? 0 : "105%" }}
                animate={{ y: 0 }}
                transition={{ duration: d(0.8), delay: d(0.1 + i * 0.035), ease: EASE_OUT }}
              >
                {ch}
              </motion.span>
            </span>
          ))}
        </h1>

        <div className="mt-8 flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="flex flex-col font-hand text-[clamp(26px,3vw,38px)] font-bold leading-[1.15] text-on-surface-variant">
              {claims.map((c, i) => (
                <span key={c} className="block overflow-hidden">
                  <motion.span
                    className={`block ${i === 2 ? "text-coral" : ""}`}
                    initial={{ y: reduce ? 0 : "100%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: d(0.7), delay: d(0.5 + i * 0.1), ease: EASE_OUT }}
                  >
                    {c}
                  </motion.span>
                </span>
              ))}
            </h2>

            <motion.div
              className="mt-8 flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: d(0.5), delay: d(0.85), ease: EASE_OUT }}
            >
              <Link
                href="/topics/fundamentals"
                className="group flex items-center gap-2 rounded-md bg-primary px-5 py-3 font-sans text-[16px] font-bold text-surface transition-[transform,background-color] duration-200 hover:bg-primary-fixed active:scale-[0.97]"
              >
                Start Unit 1
                <Icon name="east" className="text-[18px] transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#visualizers"
                className="rounded-md px-1 py-3 font-sans text-[16px] font-semibold text-on-surface underline sm:px-4 decoration-on-surface/30 underline-offset-4 transition-colors hover:decoration-primary"
              >
                Browse all {built} visualizers
              </a>
            </motion.div>
          </div>

          <motion.div
            className="max-w-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: d(0.6), delay: d(0.7) }}
          >
            <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
              Every topic in the syllabus compiled into frames you can play, pause, scrub — and break on purpose.
            </p>
            {/* The demo's preloader capsule, now an honest progress meter. */}
            <div
              role="meter"
              aria-label="Visualizers built"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={built}
              className="relative h-12 overflow-hidden rounded-full bg-surface-container-high"
            >
              <motion.div
                className="absolute inset-0 origin-left bg-primary"
                initial={{ scaleX: reduce ? fill : 0 }}
                animate={{ scaleX: reduce ? fill : [0, fill * 0.35, fill * 0.7, fill] }}
                transition={{ duration: d(1.6), delay: d(0.9), times: [0, 0.3, 0.65, 1], ease: EASE_OUT }}
              />
              {/* Two copies of the label: chalk on the board, board-green on
                  the fill, the second clipped to exactly the filled width. */}
              <MeterLabel built={built} total={total} className="text-on-surface" />
              <motion.div
                aria-hidden
                className="absolute inset-0"
                initial={{ clipPath: `inset(0 ${reduce ? (1 - fill) * 100 : 100}% 0 0)` }}
                animate={{
                  clipPath: reduce
                    ? `inset(0 ${(1 - fill) * 100}% 0 0)`
                    : [0, 0.35, 0.7, 1].map((k) => `inset(0 ${(1 - fill * k) * 100}% 0 0)`),
                }}
                transition={{ duration: d(1.6), delay: d(0.9), times: [0, 0.3, 0.65, 1], ease: EASE_OUT }}
              >
                <MeterLabel built={built} total={total} className="text-surface" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function MeterLabel({ built, total, className }: { built: number; total: number; className: string }) {
  return (
    <span
      className={`absolute inset-0 flex items-center justify-between px-5 font-mono text-[14px] font-semibold ${className}`}
    >
      <span>
        {built} / {total}
      </span>
      <span>visualizers built</span>
    </span>
  );
}
