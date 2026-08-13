import { TopicHub } from "@/components/topic/TopicHub";
import { getCategory, getSection } from "@/data/curriculum";

interface Props {
  section: string;
  category: string;
  cardsHeading?: string;
  note?: { question: string; problem: string; idea: string };
}

/** A category hub: lists the category's leaves as cards. */
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
      cards={c.leaves.map((l) => ({
        title: l.title,
        blurb: l.blurb,
        icon: l.icon,
        href: `/topics/${section}/${category}/${l.slug}`,
        status: l.status ?? "available",
        stats: l.stats,
      }))}
    />
  );
}
