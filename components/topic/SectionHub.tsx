import { TopicHub } from "@/components/topic/TopicHub";
import { getSection, leavesOf } from "@/data/curriculum";

interface Props {
  slug: string;
  note?: { question: string; problem: string; idea: string };
}

/**
 * A unit hub. Lists every leaf in the unit, grouped under its category as a
 * heading — not category cards you have to click through first.
 *
 * That removes a whole navigation step (landing → unit → topic, instead of
 * landing → unit → category → topic) and makes the unit's real scope visible
 * in one screen. The category routes still exist; the headings link to them.
 */
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
      groups={s.categories.map((c) => {
        const leaves = leavesOf(slug, c.slug);
        const ready = leaves.filter((l) => l.status !== "soon").length;
        return {
          title: c.title,
          blurb: c.blurb,
          icon: c.icon,
          href: `/topics/${slug}/${c.slug}`,
          ready: `${ready} of ${leaves.length} ready`,
          cards: leaves.map((l) => ({
            title: l.title,
            blurb: l.blurb,
            icon: l.icon,
            href: l.href,
            status: l.status,
            stats: l.stats,
          })),
        };
      })}
    />
  );
}
