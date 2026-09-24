"use client";

// Adapted from Animmaster: Navigation Menus/8 (ruled-row overlay menu)
//
// The whole syllabus on one board. Each unit is a ruled line with its title
// written into it; hovering a row dims the rest and slides a preview card to
// where that row "points", listing the unit's categories and how much of it is
// built.
//
// Changes from the demo:
// - GSAP timeline → framer-motion (already a dependency; no new library).
// - Product photos → a live preview card built from data/curriculum.ts, so
//   nothing to download and it can never go stale.
// - Proper dialog semantics: Escape closes, focus moves in on open and back
//   to the trigger on close, and the menu closes itself on navigation.
// - It doubles as the mobile nav. Below lg the navbar hides its unit links;
//   before this there was no way to reach Units 2–6 from a phone except the
//   landing page.
// - prefers-reduced-motion: the board appears instantly, no line drawing.
// - Portalled to <body>. The navbar has backdrop-filter, which makes it the
//   containing block for fixed descendants — rendered inline, "fixed inset-0"
//   only covered the 64px navbar strip.

import { AnimatePresence, motion, useReducedMotion, useSpring } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { SECTIONS, leavesOfSection, normalizePath } from "@/data/curriculum";

const EASE = [0.76, 0, 0.24, 1] as const;

// Where each row's title breaks its ruled line — the demo's flex ratios.
const LAYOUT = [
  { left: 0, right: 1 },
  { left: 3, right: 1 },
  { left: 1, right: 3 },
  { left: 3, right: 2 },
  { left: 1, right: 2 },
  { left: 2, right: 1 },
];

const ROWS = SECTIONS.map((s) => {
  const leaves = leavesOfSection(s.slug);
  return {
    ...s,
    ready: leaves.filter((l) => l.status !== "soon").length,
    total: leaves.length,
  };
});
const LIVE = ROWS.reduce((n, r) => n + r.ready, 0);

export function SyllabusMenu() {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  // true on the client, false during prerender — portals need document.body.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const trigger = useRef<HTMLButtonElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement | null>(null);
  const board = useRef<HTMLDivElement | null>(null);

  // The demo's gsap.quickTo — a spring that retargets without new tweens.
  const x = useSpring(0, { stiffness: 260, damping: 32 });
  const y = useSpring(0, { stiffness: 260, damping: 32 });

  const dismiss = () => {
    setOpen(false);
    setHover(null);
  };

  // Close on navigation (the page transition covers the swap). Adjusting state
  // while rendering, rather than in an effect, avoids a wasted render pass.
  const [seenPath, setSeenPath] = useState(pathname);
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    dismiss();
  }

  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setHover(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    dismiss();
    trigger.current?.focus();
  };

  // The card rides the hovered row's longest empty stretch of line, so it
  // never lands on top of the title you are reading (the demo's fixed
  // coordinates did, once the titles became real unit names).
  const point = (i: number, row: HTMLElement) => {
    setHover(i);
    const rect = board.current?.getBoundingClientRect();
    const title = row.querySelector("a")?.getBoundingClientRect();
    if (!rect || !title) return;
    const cardW = 340;
    const cardH = 240;
    const r = row.getBoundingClientRect();
    const leftRoom = title.left - r.left;
    const rightRoom = r.right - title.right;
    const cx = rightRoom >= leftRoom ? title.right + rightRoom / 2 : r.left + leftRoom / 2;
    x.set(Math.min(Math.max(cx - cardW / 2, 24), rect.width - cardW - 24));
    y.set(Math.min(Math.max(r.top + r.height / 2 - cardH / 2, 88), rect.height - cardH - 88));
  };

  const current = normalizePath(pathname);
  const d = (s: number) => (reduce ? 0 : s);
  const shown = hover !== null ? ROWS[hover] : null;

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="group flex items-center gap-2.5 rounded-md border border-primary px-4 py-1.5 font-sans text-[14px] font-bold text-primary transition-colors hover:bg-primary hover:text-surface active:scale-[0.97]"
      >
        <span className="flex flex-col gap-[4px]" aria-hidden>
          <span className="h-[2px] w-4 bg-current transition-transform duration-300 group-hover:-translate-x-0.5" />
          <span className="h-[2px] w-4 bg-current transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
        Syllabus
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={board}
                role="dialog"
                aria-modal="true"
                aria-label="Syllabus"
                className="fixed inset-0 z-[120] grid grid-rows-[auto_1fr_auto] bg-surface-dim text-on-surface"
                initial={{ clipPath: "inset(0 0 100% 0)" }}
                animate={{ clipPath: "inset(0 0 0% 0)" }}
                exit={{ clipPath: "inset(0 0 100% 0)" }}
                transition={{ duration: d(0.7), ease: EASE }}
              >
                {/* top bar */}
                <motion.div
                  className="flex h-20 items-center justify-between px-6 md:px-16"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: d(0.4), delay: d(0.35) }}
                >
                  <span className="font-headline-md text-headline-md text-primary">&lt;CN/&gt;</span>
                  <button
                    ref={closeBtn}
                    type="button"
                    onClick={close}
                    aria-label="Close syllabus"
                    className="relative h-11 w-11 rounded-md transition-transform duration-300 hover:rotate-90"
                  >
                    <span className="absolute left-1/2 top-1/2 h-[2px] w-7 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-on-surface" />
                    <span className="absolute left-1/2 top-1/2 h-[2px] w-7 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-on-surface" />
                  </button>
                </motion.div>

                {/* rows */}
                <ul className="flex flex-col justify-center px-6 md:px-16 [&:has(li:hover)>li:not(:hover)]:opacity-25">
                  {ROWS.map((r, i) => {
                    const l = LAYOUT[i % LAYOUT.length];
                    const href = `/topics/${r.slug}`;
                    const here = current === href || current.startsWith(`${href}/`);
                    return (
                      <li
                        key={r.slug}
                        className="flex items-center gap-4 py-3 transition-opacity duration-300 md:gap-8 md:py-4"
                        onMouseEnter={(e) => point(i, e.currentTarget)}
                        onMouseLeave={() => setHover(null)}
                      >
                        <motion.span
                          className="hidden h-px origin-left bg-on-surface/35 md:block"
                          style={{ flex: l.left }}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: d(0.7), delay: d(0.4 + i * 0.05), ease: [0.33, 1, 0.68, 1] }}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: d(0.6), delay: d(0.5 + i * 0.06), ease: [0.33, 1, 0.68, 1] }}
                        >
                          <Link
                            href={href}
                            onFocus={(e) => point(i, e.currentTarget.closest("li")!)}
                            className="group flex shrink-0 items-baseline gap-3 whitespace-nowrap md:gap-5"
                            aria-current={here ? "page" : undefined}
                          >
                            <span className="font-mono text-[13px] text-on-surface-variant">
                              {r.unit <= 5 ? `0${r.unit}` : "★"}
                            </span>
                            <span
                              className={`font-hand text-[24px] font-bold leading-none tracking-[-0.01em] transition-[letter-spacing,color] duration-500 group-hover:tracking-normal md:text-[clamp(34px,4.2vw,64px)] ${
                                here ? "text-primary" : "text-on-surface group-hover:text-primary"
                              }`}
                            >
                              {r.title}
                            </span>
                            <span className="hidden font-mono text-[13px] text-on-surface-variant sm:inline">
                              {r.ready}/{r.total}
                            </span>
                          </Link>
                        </motion.div>
                        <motion.span
                          className="hidden h-px origin-left bg-on-surface/35 md:block"
                          style={{ flex: l.right }}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: d(0.7), delay: d(0.45 + i * 0.05), ease: [0.33, 1, 0.68, 1] }}
                        />
                      </li>
                    );
                  })}
                </ul>

                {/* floating preview — desktop only, like the demo */}
                <motion.div
                  aria-hidden
                  className="pointer-events-none fixed left-0 top-0 hidden w-[340px] rounded-lg border border-outline-variant bg-surface-container p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)] lg:block"
                  style={{ x, y }}
                  animate={{ opacity: shown ? 1 : 0, scale: shown ? 1 : 0.96 }}
                  transition={{ duration: 0.25 }}
                >
                  {shown && (
                    <>
                      <div className="mb-3 flex items-center gap-2 text-primary">
                        <Icon name={shown.icon} className="text-[20px]" />
                        <span className="font-label-caps text-label-caps uppercase">
                          {shown.unit <= 5 ? `Unit ${shown.unit}` : "Capstone"}
                        </span>
                        <span className="ml-auto font-mono text-[13px] text-on-surface-variant">
                          {shown.ready} of {shown.total} built
                        </span>
                      </div>
                      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface-dim">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${shown.total ? (shown.ready / shown.total) * 100 : 0}%` }}
                        />
                      </div>
                      <p className="mb-3 font-body-sm text-body-sm text-on-surface-variant">{shown.blurb}</p>
                      <ul className="flex flex-wrap gap-1.5">
                        {shown.categories.map((c) => (
                          <li
                            key={c.slug}
                            className="rounded-sm bg-surface-dim px-2 py-0.5 font-sans text-[13px] text-on-surface/85"
                          >
                            {c.title}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </motion.div>

                {/* footer */}
                <motion.footer
                  className="flex flex-col gap-1 border-t border-on-surface/10 px-6 py-5 font-mono text-[13px] text-on-surface-variant md:flex-row md:items-center md:justify-between md:px-16"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: d(0.4), delay: d(0.4) }}
                >
                  <span>21CSC302J · Computer Networks</span>
                  <span className="hidden lg:inline">
                    {shown
                      ? `Preview · ${String((hover ?? 0) + 1).padStart(2, "0")} / 0${ROWS.length}`
                      : "Hover a unit to preview"}
                  </span>
                  <span>{LIVE} visualizers live</span>
                </motion.footer>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
