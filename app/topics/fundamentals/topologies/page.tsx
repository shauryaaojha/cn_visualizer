import { CategoryHub } from "@/components/topic/CategoryHub";

export default function Hub() {
  return (
    <CategoryHub
      section="fundamentals"
      category="topologies"
      cardsHeading="Choose a layout"
      note={{
        question: "Why does topology matter?",
        problem:
          "On a healthy network every wiring plan looks equally good — traffic arrives either way, so the choice looks arbitrary.",
        idea:
          "Cut one link. Bus, star and hybrid each partition; ring reverses direction and mesh takes a detour. Topology is a bet about which failure you can afford.",
      }}
    />
  );
}
