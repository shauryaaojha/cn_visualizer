import { SectionHub } from "@/components/topic/SectionHub";

export default function Hub() {
  return (
    <SectionHub
      slug="fundamentals"
      note={{
        question: "What does Unit 1 actually ask?",
        problem:
          "Two machines have no shared memory, no shared clock, and nothing between them but a physical medium that can only carry a signal.",
        idea:
          "Agree on a wiring plan, a way to package data so any device in between knows what to do with it, and an honest account of what that costs in time.",
      }}
    />
  );
}
