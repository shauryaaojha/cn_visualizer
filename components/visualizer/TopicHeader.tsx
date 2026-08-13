"use client";

import { Breadcrumb } from "@/components/topic/Breadcrumb";
import { LeafNav } from "@/components/topic/LeafNav";

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
  return (
    <div className="shrink-0 border-b-[1.5px] border-dashed border-outline-variant/60 bg-surface/40 px-lg py-2 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <Breadcrumb path={path} />
        <LeafNav />
      </div>
      <div className="mt-0.5 flex items-baseline gap-3">
        <h1 className="whitespace-nowrap font-headline-sm text-headline-sm text-on-surface">{title}</h1>
        <p className="hidden truncate font-body-sm text-body-sm text-on-surface-variant sm:block">{blurb}</p>
      </div>
    </div>
  );
}
