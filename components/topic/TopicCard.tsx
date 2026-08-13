import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export interface TopicCardProps {
  title: string;
  blurb: string;
  icon: string;
  href: string;
  status?: "available" | "soon";
  /** Small badges — hop counts, link counts, overhead. */
  stats?: string[];
}

/** A clickable card used on the landing page and every hub page. */
export function TopicCard({ title, blurb, icon, href, status = "available", stats }: TopicCardProps) {
  const disabled = status === "soon";

  const inner = (
    <div
      className={`group glass-panel relative flex h-full flex-col rounded-lg p-md transition-all duration-200 ${
        disabled
          ? "opacity-45"
          : "hover:-translate-y-1 hover:border-primary/70 hover:shadow-[0_8px_28px_rgba(240,210,100,0.13)]"
      }`}
    >
      <div className="mb-md flex items-start justify-between">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-lg border-[1.5px] border-dashed ${
            disabled
              ? "border-outline-variant text-on-surface-variant"
              : "border-primary/50 bg-primary/10 text-primary group-hover:bg-primary/20"
          }`}
        >
          <Icon name={icon} className="text-[22px]" />
        </span>
        {disabled ? (
          <span className="rounded-sm border-[1.5px] border-dashed border-outline-variant px-2 py-0.5 font-label-caps text-[9px] uppercase text-on-surface-variant">
            Soon
          </span>
        ) : (
          <Icon
            name="arrow_outward"
            className="text-[18px] text-on-surface-variant/40 transition-colors group-hover:text-primary"
          />
        )}
      </div>

      <h3 className="mb-1 font-headline-sm text-headline-sm text-on-surface">{title}</h3>
      <p className="flex-1 font-body-sm text-body-sm leading-relaxed text-on-surface-variant">{blurb}</p>

      {stats && stats.length > 0 && (
        <div className="mt-md flex flex-wrap items-center gap-2">
          {stats.map((s, i) => (
            <span
              key={s}
              className={`rounded-sm border-[1.5px] border-dashed px-2 py-0.5 font-code-snippet text-[11px] ${
                i === 0 ? "border-primary/50 bg-primary/10 text-primary" : "border-note/50 bg-note/10 text-note"
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
