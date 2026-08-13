import { TopicHub } from "@/components/topic/TopicHub";
import { getSection } from "@/data/curriculum";

interface Props {
  slug: string;
  note?: { question: string; problem: string; idea: string };
}

/** A unit hub: lists the unit's categories as cards. */
export function SectionHub({ slug, note }: Props) {
  const s = getSection(slug)!;
  return (
    <TopicHub
      path={`/topics/${slug}`}
      icon={s.icon}
      eyebrow={s.unit <= 5 ? `UNIT ${s.unit}` : "CAPSTONE"}
      title={s.title}
      blurb={s.blurb}
      note={note}
      cardsHeading="Choose a topic"
      cards={s.categories.map((c) => {
        const ready = c.leaves.filter((l) => l.status !== "soon").length;
        return {
          title: c.title,
          blurb: c.blurb,
          icon: c.icon,
          href: `/topics/${slug}/${c.slug}`,
          status: c.status,
          stats: c.status === "available" ? [`${ready} of ${c.leaves.length} ready`] : undefined,
        };
      })}
    />
  );
}
