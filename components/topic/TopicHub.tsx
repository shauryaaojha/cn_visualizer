import { BoardBackground } from "@/components/layout/BoardBackground";
import { Navbar } from "@/components/layout/Navbar";
import { Breadcrumb } from "@/components/topic/Breadcrumb";
import { TopicCard, type TopicCardProps } from "@/components/topic/TopicCard";
import { Icon } from "@/components/ui/Icon";
import { PALETTE } from "@/lib/palette";

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
  /** The aside a teacher writes in the corner before starting. */
  note?: { question: string; problem: string; idea: string; accent?: string };
}

/** Shared layout for the landing page and every drill-down hub page. */
export function TopicHub({ path, icon, title, blurb, eyebrow, cards, cardsHeading, note }: TopicHubProps) {
  const accent = note?.accent ?? PALETTE.note;
  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <BoardBackground />
      <Navbar />

      <div className="scroll-thin mt-16 flex-1 overflow-y-auto">
        <div className="chalk-in mx-auto w-full max-w-6xl px-margin py-xl">
          {path && (
            <div className="mb-lg">
              <Breadcrumb path={path} />
            </div>
          )}

          <header className="mb-xl flex items-start gap-md">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-dashed border-primary/50 bg-primary/10 text-primary">
              <Icon name={icon} className="text-[28px]" />
            </span>
            <div>
              {eyebrow && (
                <p className="mb-1 flex items-center gap-1.5 font-label-caps text-label-caps uppercase text-primary/85">
                  <span className="h-[5px] w-[5px] rounded-full bg-primary shadow-[0_0_6px_currentColor]" />
                  {eyebrow}
                </p>
              )}
              <h1 className="font-headline-lg text-headline-lg text-on-surface">{title}</h1>
              {/* The rule a teacher draws under the title as they say it. */}
              <div className="chalk-underline mt-1" />
              <p className="mt-2 max-w-2xl font-body-md text-body-md text-on-surface-variant">{blurb}</p>
            </div>
          </header>

          {note && (
            <div className="glass-panel mb-xl rounded-lg p-5" style={{ borderColor: `${accent}66` }}>
              <p
                className="mb-3 flex items-center gap-2 font-label-caps text-label-caps uppercase tracking-widest"
                style={{ color: accent }}
              >
                <span className="text-[15px] leading-none">👨‍🏫</span>
                {note.question}
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                  <span className="mr-2 rounded-sm border-[1.5px] border-dashed border-coral/60 bg-coral/10 px-1.5 py-px font-label-caps text-[9px] tracking-wider text-coral">
                    THE PROBLEM
                  </span>
                  {note.problem}
                </p>
                <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                  <span className="mr-2 rounded-sm border-[1.5px] border-dashed border-mint/60 bg-mint/10 px-1.5 py-px font-label-caps text-[9px] tracking-wider text-mint">
                    THE IDEA
                  </span>
                  {note.idea}
                </p>
              </div>
            </div>
          )}

          {cardsHeading && (
            <h2 className="mb-md font-label-caps text-label-caps uppercase text-on-surface-variant">
              {cardsHeading}
            </h2>
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
