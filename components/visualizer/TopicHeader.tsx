"use client";

import { Breadcrumb } from "@/components/topic/Breadcrumb";
import { LeafNav } from "@/components/topic/LeafNav";
import { Icon } from "@/components/ui/Icon";
import { useRecordStore } from "@/lib/recordStore";
import { LESSON_KEYS } from "@/lib/useLessonKeys";

interface TopicHeaderProps {
  path: string;
  title: string;
  blurb: string;
}

/**
 * Header strip above the canvas. In flow rather than absolutely positioned, so
 * the canvas below it gets a real box to measure instead of sliding underneath.
 */
export function TopicHeader({ path, title, blurb }: TopicHeaderProps) {
  const toggleRecord = useRecordStore((s) => s.toggle);

  return (
    <div className="shrink-0 border-b border-outline-variant/60 bg-surface/40 px-lg py-2 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <Breadcrumb path={path} />
        <div className="flex items-center gap-2">
          <LeafNav />
          <span className="h-4 w-px bg-outline-variant" />
          <button
            onClick={toggleRecord}
            title={`Record mode (P)\n\n${LESSON_KEYS.map((k) => `${k.keys} — ${k.does}`).join("\n")}`}
            aria-label="Enter record mode"
            className="flex items-center gap-1 rounded-md border border-outline-variant px-2 py-1 font-sans text-[13px] font-bold text-on-surface-variant transition-colors hover:border-coral hover:text-coral"
          >
            <Icon name="videocam" className="text-[15px]" />
            <span className="hidden xl:inline">Record</span>
          </button>
        </div>
      </div>
      <div className="mt-0.5 flex items-baseline gap-3">
        <h1 className="whitespace-nowrap font-headline-sm text-headline-sm text-on-surface">{title}</h1>
        <p className="hidden truncate font-body-sm text-body-sm text-on-surface-variant sm:block">{blurb}</p>
      </div>
    </div>
  );
}
