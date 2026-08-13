"use client";

import { Breadcrumb } from "@/components/topic/Breadcrumb";

interface TopicHeaderProps {
  path: string;
  title: string;
  blurb: string;
}

/** Slim header strip above a visualizer canvas: breadcrumb + title + blurb. */
export function TopicHeader({ path, title, blurb }: TopicHeaderProps) {
  return (
    <div className="pointer-events-auto absolute left-0 right-0 top-0 z-10 border-b-[1.5px] border-dashed border-outline-variant/60 bg-surface/50 px-lg py-2.5 backdrop-blur-md">
      <Breadcrumb path={path} />
      <div className="mt-1 flex items-baseline gap-3">
        <h1 className="whitespace-nowrap font-headline-sm text-headline-sm text-on-surface">{title}</h1>
        <p className="hidden truncate font-body-sm text-body-sm text-on-surface-variant sm:block">{blurb}</p>
      </div>
    </div>
  );
}
