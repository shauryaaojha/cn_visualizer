import { CategoryHub } from "@/components/topic/CategoryHub";

export default function Hub() {
  return (
    <CategoryHub
      section="fundamentals"
      category="network-types"
      cardsHeading="Network Types by Geographical Scale"
      note={{
        question: "Why do we classify networks by scale?",
        problem:
          "Sending data across a desk requires completely different technologies and latency budgets than sending data across oceans.",
        idea:
          "From personal radius (PAN) to rooms (LAN) to metropolitan areas (MAN) to global carriers (WAN), scale dictates media, latency, and routing protocols.",
      }}
    />
  );
}
