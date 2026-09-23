"use client";

// Sibling-topic tabs for the top of every sidebar.
//
// Previously only the network sidebar had these, so encapsulation and
// bandwidth-vs-latency were dead ends — the only way to a neighbouring topic
// was back up through two hub pages. Derived from the curriculum rather than
// hand-listed, so it stays correct as leaves are added.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { leafNeighbours, normalizePath } from "@/data/curriculum";

export function SidebarTabs({ columns = 3 }: { columns?: number }) {
  const pathname = normalizePath(usePathname());
  const { siblings } = leafNeighbours(pathname);
  if (siblings.length < 2) return null;

  return (
    <div>
      <label className="mb-1.5 block font-label-caps text-[12px] uppercase tracking-[0.08em] text-on-surface-variant/70">
        In this topic
      </label>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
        {siblings.map((l) => {
          const selected = l.href === pathname;
          const disabled = l.status === "soon";
          const cls = `flex flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 transition-colors ${
            selected
              ? "border-primary bg-primary/12 text-primary"
              : disabled
                ? "cursor-not-allowed border-outline-variant/50 text-on-surface-variant/35"
                : " border-outline-variant text-on-surface-variant hover:border-primary/70 hover:text-on-surface"
          }`;
          const body = (
            <>
              <Icon name={l.icon} className="text-[16px]" />
              <span className="w-full truncate text-center font-label-caps text-[12px] leading-tight">
                {l.title}
              </span>
            </>
          );
          return disabled ? (
            <div key={l.href} className={cls} title={`${l.title} — coming soon`}>
              {body}
            </div>
          ) : (
            <Link key={l.href} href={l.href} className={cls} title={l.title}>
              {body}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
