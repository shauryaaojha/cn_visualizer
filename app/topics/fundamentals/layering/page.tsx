import { CategoryHub } from "@/components/topic/CategoryHub";

export default function Hub() {
  return (
    <CategoryHub
      section="fundamentals"
      category="layering"
      note={{
        question: "Why split it into layers at all?",
        problem:
          "Getting a message across a network needs encoding, addressing, routing, framing and signalling — and every one of those choices changes independently of the others.",
        idea:
          "Give each concern one layer and one header. A layer only talks to its opposite number on the far machine, so fibre can replace copper without HTTP ever noticing.",
      }}
    />
  );
}
