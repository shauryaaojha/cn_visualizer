import { CategoryHub } from "@/components/topic/CategoryHub";

export default function Hub() {
  return (
    <CategoryHub
      section="fundamentals"
      category="introduction"
      cardsHeading="Explore Network Fundamentals"
      note={{
        question: "What actually happens when data moves?",
        problem:
          "Computers cannot send raw application data across arbitrary distances without addressing, segmentation, and error checking.",
        idea:
          "Data is chopped into packets, tagged with headers, serialized onto transmission media, and reassembled at the destination.",
      }}
    />
  );
}
