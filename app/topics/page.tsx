import { TopicHub } from "@/components/topic/TopicHub";
import { SECTIONS } from "@/data/curriculum";

export default function Topics() {
  return (
    <TopicHub
      path="/topics"
      icon="menu_book"
      eyebrow="SYLLABUS"
      title="All Units"
      blurb="The full 21CSC302J session plan, mapped to visualizers."
      cardsHeading="Units"
      cards={SECTIONS.map((s) => ({
        title: s.unit <= 5 ? `Unit ${s.unit} · ${s.title}` : s.title,
        blurb: s.blurb,
        icon: s.icon,
        href: `/topics/${s.slug}`,
        stats: s.status === "available" ? ["building now"] : ["roadmap"],
      }))}
    />
  );
}
