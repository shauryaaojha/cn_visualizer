import { TopicHub } from "@/components/topic/TopicHub";
import { SECTIONS } from "@/data/curriculum";

export default function Landing() {
  return (
    <TopicHub
      icon="lan"
      eyebrow="21CSC302J · COMPUTER NETWORKS"
      title="CN_Visualizer"
      blurb="Five units, forty-five topics, one rule: if it is a process it moves, if it is an algorithm it steps, and if it is a network you can break it."
      note={{
        question: "Why a visualizer and not notes?",
        problem:
          "Networking gets taught as static diagrams and definitions, so packets never move, routing tables never converge, and a topology's weakness only shows up in an exam question.",
        idea:
          "Compile every topic into frames you can play, pause and scrub — then add a fault button, so you can watch the same network succeed and fail side by side.",
      }}
      cardsHeading="Choose a unit"
      cards={SECTIONS.map((s) => ({
        // Every unit hub is browsable so the roadmap is visible; the leaves
        // inside an unbuilt unit are the things marked SOON.
        title: s.unit <= 5 ? `Unit ${s.unit} · ${s.title}` : s.title,
        blurb: s.blurb,
        icon: s.icon,
        href: `/topics/${s.slug}`,
        stats:
          s.status === "available"
            ? ["building now", `${s.categories.length} categories`]
            : ["roadmap", `${s.categories.length} categories`],
      }))}
    />
  );
}
