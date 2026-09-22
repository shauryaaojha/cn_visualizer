import { CategoryHub } from "@/components/topic/CategoryHub";

export default function Hub() {
  return (
    <CategoryHub
      section="addressing"
      category="allocation"
      cardsHeading="Choose an allocation strategy"
      note={{
        question: "How do you divide an address space without waste?",
        problem:
          "Giving every department an equal-sized subnet either leaves small departments wasting hundreds of unused addresses, or starves large departments.",
        idea:
          "Sort requirements largest-first and carve blocks sized to exact powers of two. VLSM fits diverse network sizes into a single block with zero fragmentation.",
      }}
    />
  );
}
