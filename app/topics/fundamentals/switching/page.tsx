import { CategoryHub } from "@/components/topic/CategoryHub";

export default function Hub() {
  return (
    <CategoryHub
      section="fundamentals"
      category="switching"
      cardsHeading="Switching Methodologies"
      note={{
        question: "How should network resources be allocated?",
        problem:
          "Circuit switching locks dedicated end-to-end paths; packet switching splits messages into independently-routed datagrams.",
        idea:
          "Compare connection setup overhead, jitter, statistical multiplexing efficiency, and behavior under bursty Internet traffic.",
      }}
    />
  );
}
