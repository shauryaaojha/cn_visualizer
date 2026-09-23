"use client";

// The front door. One job per section, in the order a student needs them:
//
//   1. Hero        — what this is, how much of it exists, where to start.
//   2. Units       — the syllabus as a ruled list with honest progress.
//   3. Strip       — every visualizer that runs today, one drag away.
//   4. One "how it works" per unit, each driven by scroll:
//        Unit 1 build the stack · Unit 2 carve the address · Unit 3 find the
//        path · Unit 4 catch the error · Unit 5 shake hands
//
// The landing page scrolls inside its own container (the body is
// overflow:hidden for the app shell), so the scroll-linked stack is handed that
// container explicitly.

import Link from "next/link";
import { useRef } from "react";
import { BoardBackground } from "@/components/layout/BoardBackground";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/landing/Hero";
import { OsiStack } from "@/components/landing/OsiStack";
import { CarveAddress, CARVE_STEPS } from "@/components/landing/showcase/CarveAddress";
import { CatchError, ERROR_STEPS } from "@/components/landing/showcase/CatchError";
import { FindPath, PATH_STEPS } from "@/components/landing/showcase/FindPath";
import { ScrollShowcase } from "@/components/landing/showcase/ScrollShowcase";
import { HANDSHAKE_STEPS, ShakeHands } from "@/components/landing/showcase/ShakeHands";
import { VisualizerStrip } from "@/components/landing/VisualizerStrip";
import { Icon } from "@/components/ui/Icon";
import { SECTIONS, leavesOfSection } from "@/data/curriculum";

const UNITS = SECTIONS.map((s) => {
  const leaves = leavesOfSection(s.slug);
  const ready = leaves.filter((l) => l.status !== "soon").length;
  return { ...s, ready, total: leaves.length };
});

const BUILT = UNITS.flatMap((u) =>
  leavesOfSection(u.slug)
    .filter((l) => l.status !== "soon")
    .map((l) => ({
      ...l,
      unitLabel: u.unit <= 5 ? `Unit ${u.unit}` : "Capstone",
      categoryTitle: u.categories.find((c) => c.slug === l.category)?.title ?? "",
    })),
);
const TOTAL = UNITS.reduce((n, u) => n + u.total, 0);

export function Landing() {
  const scroller = useRef<HTMLDivElement | null>(null);

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden">
      <BoardBackground />
      <Navbar />

      <div ref={scroller} className="scroll-thin mt-16 flex-1 overflow-y-auto scroll-smooth">
        <Hero built={BUILT.length} total={TOTAL} />

        {/* 2 — units */}
        <section aria-labelledby="units" className="mx-auto w-full max-w-6xl px-margin py-24">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 font-label-caps text-label-caps uppercase text-primary">The syllabus</p>
              <h2 id="units" className="font-headline-lg text-headline-lg text-on-surface">
                Five units and a capstone.
              </h2>
            </div>
            <p className="max-w-sm font-body-md text-body-md text-on-surface-variant">
              Unit 1 is complete. The rest are mapped topic by topic, so you can see exactly what is coming.
            </p>
          </div>

          <ol className="border-t border-outline-variant">
            {UNITS.map((u) => {
              const pct = u.total ? Math.round((u.ready / u.total) * 100) : 0;
              const done = u.ready === u.total && u.total > 0;
              return (
                <li key={u.slug} className="border-b border-outline-variant">
                  <Link
                    href={`/topics/${u.slug}`}
                    className="group grid grid-cols-[3rem_1fr_auto] items-center gap-x-4 gap-y-2 py-6 transition-colors duration-200 hover:bg-surface-container-low/60 md:grid-cols-[4rem_minmax(0,1.1fr)_minmax(0,1fr)_11rem_2rem] md:gap-x-6 md:px-3"
                  >
                    <span className="font-mono text-[15px] text-on-surface-variant">
                      {u.unit <= 5 ? `0${u.unit}` : "★"}
                    </span>
                    <span className="font-hand text-[26px] font-bold leading-tight text-on-surface transition-colors group-hover:text-primary md:text-[30px]">
                      {u.title}
                    </span>
                    <Icon
                      name="east"
                      className="text-[20px] text-on-surface-variant transition-[color,transform] duration-200 group-hover:translate-x-1 group-hover:text-primary md:order-last"
                    />
                    <span className="col-span-3 font-body-sm text-body-sm text-on-surface-variant md:col-span-1">
                      {u.blurb}
                    </span>
                    <span className="col-span-3 flex items-center gap-3 md:col-span-1">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-high">
                        <span
                          className={`block h-full rounded-full ${done ? "bg-mint" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="w-14 text-right font-mono text-[13px] text-on-surface-variant">
                        {u.ready}/{u.total}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        {/* 3 — every visualizer */}
        <section id="visualizers" aria-labelledby="strip" className="scroll-mt-4 py-12">
          <div className="mx-auto mb-8 flex w-full max-w-6xl flex-wrap items-end justify-between gap-4 px-margin">
            <div>
              <p className="mb-2 font-label-caps text-label-caps uppercase text-primary">Ready to run</p>
              <h2 id="strip" className="font-headline-lg text-headline-lg text-on-surface">
                {BUILT.length} visualizers, one drag away.
              </h2>
            </div>
            <p className="font-sans text-[14px] text-on-surface-variant">Drag, swipe sideways, or Tab through.</p>
          </div>
          <VisualizerStrip items={BUILT} />
        </section>

        {/* 4 — OSI stack */}
        <OsiStack scroller={scroller} />

        <ScrollShowcase
          scroller={scroller}
          eyebrow="Unit 2 · Addressing"
          title="Carve the address."
          blurb="One IPv4 address, split by a mask, borrowed from, and sized to fit — the whole of subnetting in four moves."
          steps={CARVE_STEPS}
          href="/topics/addressing"
          cta="Open Unit 2"
          visual={(_, r, p) => <CarveAddress progress={p} reduce={r} />}
        />
        <ScrollShowcase
          scroller={scroller}
          eyebrow="Unit 3 · Routing"
          title="Find the path."
          blurb="Six routers, none of which can see the whole map, still agree on the cheapest route — and find a new one when a link dies."
          steps={PATH_STEPS}
          href="/topics/routing"
          cta="Open Unit 3"
          visual={(i, r, p) => <FindPath active={i} progress={p} reduce={r} />}
        />
        <ScrollShowcase
          scroller={scroller}
          eyebrow="Unit 4 · Data Link"
          title="Catch the error."
          blurb="One frame, one flipped bit, and the checksum that notices — error control is refusing bad frames and asking again."
          steps={ERROR_STEPS}
          href="/topics/data-link"
          cta="See Unit 4"
          visual={(i, r, p) => <CatchError active={i} progress={p} reduce={r} />}
        />
        <ScrollShowcase
          scroller={scroller}
          eyebrow="Unit 5 · Transport & Application"
          title="Shake hands."
          blurb="Everything that happens between typing a name and seeing a page: DNS, TCP's handshake, then HTTP."
          steps={HANDSHAKE_STEPS}
          href="/topics/transport-application"
          cta="See Unit 5"
          visual={(_, r, p) => <ShakeHands progress={p} reduce={r} />}
        />

        <footer className="mx-auto flex w-full max-w-6xl flex-col gap-2 border-t border-outline-variant px-margin py-10 font-sans text-[14px] text-on-surface-variant md:flex-row md:justify-between">
          <span>CN_Visualizer · 21CSC302J Computer Networks</span>
          <span>
            Recording a lesson? Press <kbd className="rounded bg-surface-container-high px-1.5 font-mono">P</kbd> on
            any visualizer. Works offline.
          </span>
        </footer>
      </div>
    </div>
  );
}
