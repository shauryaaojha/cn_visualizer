import { CategoryHub } from "@/components/topic/CategoryHub";

export default function Hub() {
  return (
    <CategoryHub
      section="fundamentals"
      category="performance"
      cardsHeading="Choose a delay"
      note={{
        question: "Why does a fast connection feel slow?",
        problem:
          "Bandwidth is the number on the bill, so it gets treated as the number that decides speed — which is why a 100 Mbps satellite link still feels sluggish.",
        idea:
          "Four separate delays add up: queuing, processing, transmission and propagation. Only one of them is bandwidth's job, and for small transfers it is the smallest of the four.",
      }}
    />
  );
}
