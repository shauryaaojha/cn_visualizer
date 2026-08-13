import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export interface TopicCardProps {
  title: string;
  blurb: string;
  icon: string;
  href: string;
  status?: "available" | "soon";
  /** Small badges — hop counts, link counts, overhead. CN's answer to Big-O chips. */
  stats?: string[];
}

/** A clickable card used on the landing page and every hub page. */
export function TopicCard({ title, blurb, icon, href, status = "available", stats }: TopicCardProps) {
  const disabled = status === "soon";

  const inner = (
    <div
      className={`group glass-panel relative flex h-full flex-col rounded-lg p-md transition-all duration-200 ${
        disabled
          ? "opacity-50"
          : "hover:-translate-y-1 hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(34,211,238,0.14)]"
      }`}
    >
      <div className="mb-md flex items-start justify-between">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-lg border ${
            disabled
              ? "border-outline-variant text-on-surface-variant"
              : "border-primary/40 bg-primary/10 text-primary group-hover:bg-primary/20"
          }`}
        >
          <Icon name={icon} className="text-[22px]" />
        </span>
        {disabled ? (
          <span className="rounded-sm border border-outline-variant bg-surface-container-high px-2 py-0.5 font-label-caps text-[9px] text-on-surface-variant">
            SOON
          </span>
        ) : (
          <Icon
            name="arrow_outward"
            className="text-[18px] text-on-surface-variant/40 transition-colors group-hover:text-primary"
          />
        )}
      </div>

      <h3 className="mb-1 font-headline-sm text-headline-sm text-on-surface">{title}</h3>
      <p className="flex-1 font-body-sm text-body-sm leading-relaxed text-on-surface-variant/80">{blurb}</p>

      {stats && stats.length > 0 && (
        <div className="mt-md flex flex-wrap items-center gap-2">
          {stats.map((s, i) => (
            <span
              key={s}
              className={`border px-2 py-0.5 font-code-snippet text-[11px] ${
                i === 0 ? "border-primary/40 bg-primary/10 text-primary" : "border-amber/40 bg-amber/10 text-amber"
              }`}
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  if (disabled) {
    return (
      <div className="cursor-not-allowed" title="Coming soon">
        {inner}
      </div>
    );
  }
  return (
    <Link href={href} className="block h-full">
      {inner}
    </Link>
  );
}
