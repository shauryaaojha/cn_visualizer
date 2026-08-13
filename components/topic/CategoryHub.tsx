import { TopicHub } from "@/components/topic/TopicHub";
import { getCategory, getSection, leavesOf } from "@/data/curriculum";

interface Props {
  section: string;
  category: string;
  cardsHeading?: string;
  note?: { question: string; problem: string; idea: string };
}

/** A category hub. Still routable, but no longer the only way to reach a leaf. */
export function CategoryHub({ section, category, cardsHeading, note }: Props) {
  const s = getSection(section)!;
  const c = getCategory(section, category)!;
  return (
    <TopicHub
      path={`/topics/${section}/${category}`}
      icon={c.icon}
      eyebrow={`${s.unit <= 5 ? `UNIT ${s.unit}` : "CAPSTONE"} · ${c.title.toUpperCase()}`}
      title={c.title}
      blurb={c.blurb}
      note={note}
      cardsHeading={cardsHeading ?? "Choose a topic"}
      cards={leavesOf(section, category).map((l) => ({
        title: l.title,
        blurb: l.blurb,
        icon: l.icon,
        href: l.href,
        status: l.status,
        stats: l.stats,
      }))}
    />
  );
}
