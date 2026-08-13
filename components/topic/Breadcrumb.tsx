import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { humanize } from "@/data/curriculum";

/** Derives a breadcrumb from a /topics/... path. Each crumb links to its level. */
export function Breadcrumb({ path }: { path: string }) {
  const segments = path.split("/").filter(Boolean);
  const crumbs = segments.map((seg, i) => ({
    label: seg === "topics" ? "Topics" : humanize(seg),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav className="flex flex-wrap items-center gap-1 font-label-caps text-[11px] tracking-wide">
      <Link href="/" className="text-on-surface-variant/70 transition-colors hover:text-primary">
        <Icon name="home" className="text-[14px]" />
      </Link>
      {crumbs.map((c) => (
        <span key={c.href} className="flex items-center gap-1">
          <Icon name="chevron_right" className="text-[14px] text-on-surface-variant/40" />
          {c.isLast ? (
            <span className="text-primary">{c.label}</span>
          ) : (
            <Link href={c.href} className="text-on-surface-variant/70 transition-colors hover:text-primary">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
