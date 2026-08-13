import { Navbar } from "@/components/layout/Navbar";
import { ShaderBackground } from "@/components/layout/ShaderBackground";
import { Breadcrumb } from "@/components/topic/Breadcrumb";
import { TopicCard, type TopicCardProps } from "@/components/topic/TopicCard";
import { Icon } from "@/components/ui/Icon";

interface TopicHubProps {
  /** Path for the breadcrumb. Omit on the landing page. */
  path?: string;
  icon: string;
  title: string;
  blurb: string;
  /** Small label above the title, e.g. "UNIT 1 · TOPOLOGIES". */
  eyebrow?: string;
  cards: TopicCardProps[];
  cardsHeading?: string;
  /** "Why does this matter?" — the framing note above the cards. */
  note?: { question: string; problem: string; idea: string; accent?: string };
}

/** Shared layout for the landing page and every drill-down hub page. */
export function TopicHub({ path, icon, title, blurb, eyebrow, cards, cardsHeading, note }: TopicHubProps) {
  const accent = note?.accent ?? "#22D3EE";
  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <ShaderBackground />
      <Navbar />

      <div className="scroll-thin mt-16 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-margin py-xl">
          {path && (
            <div className="mb-lg">
              <Breadcrumb path={path} />
            </div>
          )}

          <header className="mb-xl flex items-start gap-md">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary">
              <Icon name={icon} className="text-[28px]" />
            </span>
            <div>
              {eyebrow && (
                <p className="mb-1 font-label-caps text-label-caps text-primary/80">{eyebrow}</p>
              )}
              <h1 className="font-headline-lg text-headline-lg text-on-surface">{title}</h1>
              <p className="mt-2 max-w-2xl font-body-md text-body-md text-on-surface-variant/80">{blurb}</p>
            </div>
          </header>

          {note && (
            <div className="glass-panel mb-xl rounded-lg border-l-2 p-5" style={{ borderLeftColor: accent }}>
              <p
                className="mb-3 flex items-center gap-2 font-label-caps text-[10px] tracking-widest"
                style={{ color: accent }}
              >
                <Icon name="help" className="text-[15px]" />
                {note.question.toUpperCase()}
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant/85">
                  <span className="mr-2 rounded-sm border border-coral/50 bg-coral/10 px-1.5 py-px font-label-caps text-[9px] tracking-wider text-coral">
                    THE PROBLEM
                  </span>
                  {note.problem}
                </p>
                <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant/85">
                  <span className="mr-2 rounded-sm border border-mint/50 bg-mint/10 px-1.5 py-px font-label-caps text-[9px] tracking-wider text-mint">
                    THE IDEA
                  </span>
                  {note.idea}
                </p>
              </div>
            </div>
          )}

          {cardsHeading && (
            <h2 className="mb-md font-label-caps text-label-caps text-on-surface-variant">{cardsHeading}</h2>
          )}

          <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <TopicCard key={c.href} {...c} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
