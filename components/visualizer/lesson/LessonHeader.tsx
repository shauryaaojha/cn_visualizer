"use client";

// One row above the stage: where you are, where you can go, and the modes.
//
// This replaces three things that each said "navigate" — a breadcrumb, a
// prev/next pair and a grid of sibling tabs inside the sidebar. The siblings
// are now pills in the header (the thing you most often switch between), and
// prev/next crosses into the neighbouring category.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { leafNeighbours, normalizePath } from "@/data/curriculum";
import { useLessonUi } from "@/lib/lessonUiStore";
import { useRecordStore } from "@/lib/recordStore";
import { LESSON_KEYS } from "@/lib/useLessonKeys";

interface LessonHeaderProps {
  title: string;
  hasSetup: boolean;
}

export function LessonHeader({ title, hasSetup }: LessonHeaderProps) {
  const pathname = normalizePath(usePathname());
  const { siblings, prev, next, indexInUnit, builtInUnit } = leafNeighbours(pathname);
  const toggleRecord = useRecordStore((s) => s.toggle);
  const { predict, togglePredict, score, setSetupOpen, inspectorOpen, setInspectorOpen } = useLessonUi();

  const quiet =
    "flex h-9 items-center gap-1.5 rounded-md border border-outline-variant px-2.5 font-sans text-[14px] font-semibold text-on-surface-variant transition-colors hover:border-primary/70 hover:text-on-surface";

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-outline-variant bg-surface/60 px-4 py-2.5 backdrop-blur-md">
      {hasSetup && (
        <button type="button" onClick={() => setSetupOpen(true)} className={quiet} title="Change the inputs">
          <Icon name="tune" className="text-[18px]" />
          <span>Setup</span>
        </button>
      )}

      <h1 className="font-hand text-[26px] font-bold leading-none text-on-surface">{title}</h1>

      {siblings.length > 1 && (
        <nav aria-label="Topics in this category" className="scroll-thin -my-1 flex min-w-0 items-center gap-1 overflow-x-auto py-1">
          {siblings.map((l) => {
            const here = l.href === pathname;
            const soon = l.status === "soon";
            const cls = `flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 font-sans text-[13px] font-semibold transition-colors ${
              here
                ? "bg-primary text-surface"
                : soon
                  ? "cursor-not-allowed text-on-surface-variant/45"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`;
            return soon ? (
              <span key={l.href} className={cls} title="Coming soon">
                {l.title}
              </span>
            ) : (
              <Link key={l.href} href={l.href} className={cls} aria-current={here ? "page" : undefined}>
                <Icon name={l.icon} className="text-[16px]" />
                {l.title}
              </Link>
            );
          })}
        </nav>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={togglePredict}
          aria-pressed={predict}
          title="Predict mode: answer before each reveal"
          className={`flex h-9 items-center gap-2 rounded-md border px-2.5 font-sans text-[14px] font-semibold transition-colors ${
            predict
              ? "border-note bg-note/15 text-note"
              : "border-outline-variant text-on-surface-variant hover:border-note/70 hover:text-on-surface"
          }`}
        >
          <Icon name="help" className="text-[18px]" />
          <span className="hidden sm:inline">Predict</span>
          {predict && score.asked > 0 && (
            <span className="rounded bg-note/20 px-1.5 font-mono text-[12px]">
              {score.right}/{score.asked}
            </span>
          )}
          <span
            aria-hidden
            className={`relative h-4 w-7 rounded-full transition-colors ${predict ? "bg-note" : "bg-surface-container-highest"}`}
          >
            <span
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-surface transition-transform ${
                predict ? "translate-x-3.5" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>

        {indexInUnit >= 0 && (
          <div className="flex items-center">
            {prev ? (
              <Link href={prev.href} className={`${quiet} rounded-r-none`} title={`Previous: ${prev.title}`}>
                <Icon name="chevron_left" className="text-[18px]" />
              </Link>
            ) : (
              <span className={`${quiet} pointer-events-none rounded-r-none opacity-40`}>
                <Icon name="chevron_left" className="text-[18px]" />
              </span>
            )}
            <span className="flex h-9 items-center border-y border-outline-variant px-2 font-mono text-[13px] text-on-surface-variant">
              {indexInUnit + 1}/{builtInUnit}
            </span>
            {next ? (
              <Link href={next.href} className={`${quiet} rounded-l-none`} title={`Next: ${next.title}`}>
                <Icon name="chevron_right" className="text-[18px]" />
              </Link>
            ) : (
              <span className={`${quiet} pointer-events-none rounded-l-none opacity-40`}>
                <Icon name="chevron_right" className="text-[18px]" />
              </span>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setInspectorOpen(!(inspectorOpen ?? window.innerWidth >= 1024))}
          aria-pressed={inspectorOpen === true}
          className={`${quiet} ${inspectorOpen ? "border-primary/60 text-on-surface" : ""}`}
          title="Inspector"
        >
          <Icon name="receipt_long" className="text-[18px]" />
          <span className="hidden xl:inline">Inspector</span>
        </button>

        <button
          type="button"
          onClick={toggleRecord}
          title={`Record mode (P)\n\n${LESSON_KEYS.map((k) => `${k.keys} — ${k.does}`).join("\n")}`}
          className={`${quiet} hover:border-coral hover:text-coral`}
        >
          <Icon name="videocam" className="text-[18px]" />
          <span className="hidden xl:inline">Record</span>
        </button>
      </div>
    </header>
  );
}
