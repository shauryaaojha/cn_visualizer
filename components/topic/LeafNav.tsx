"use client";

// Prev/next across the whole unit, shown in the leaf header.
//
// Skips unbuilt leaves, so "next" always lands somewhere that actually runs.
// This plus SidebarTabs is what stops a visualizer page from being a dead end.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { leafNeighbours } from "@/data/curriculum";

export function LeafNav() {
  const pathname = usePathname();
  const { prev, next, indexInUnit, builtInUnit } = leafNeighbours(pathname);
  if (indexInUnit < 0) return null;

  const cls =
    "flex items-center gap-1 rounded-md border border-outline-variant px-2 py-1 font-sans text-[13px] font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary";

  return (
    <div className="flex items-center gap-2">
      {prev ? (
        <Link href={prev.href} className={cls} title={prev.title}>
          <Icon name="chevron_left" className="text-[15px]" />
          <span className="hidden max-w-[8rem] truncate xl:inline">{prev.title}</span>
        </Link>
      ) : (
        <span className="w-px" />
      )}

      <span className="whitespace-nowrap font-mono text-[12px] text-on-surface-variant/55">
        {indexInUnit + 1} / {builtInUnit}
      </span>

      {next ? (
        <Link href={next.href} className={cls} title={next.title}>
          <span className="hidden max-w-[8rem] truncate xl:inline">{next.title}</span>
          <Icon name="chevron_right" className="text-[15px]" />
        </Link>
      ) : (
        <span className="w-px" />
      )}
    </div>
  );
}
