import { CategoryHub } from "@/components/topic/CategoryHub";

export default function Hub() {
  return (
    <CategoryHub
      section="addressing"
      category="ipv4"
      cardsHeading="Explore IPv4 structure"
      note={{
        question: "Why 32 bits?",
        problem:
          "Four decimal numbers separated by dots look simple, but routers cannot route decimal digits or understand arbitrary boundaries without explicit masks.",
        idea:
          "Every IPv4 address is an exact 32-bit binary number. The prefix tells you precisely which bit marks the frontier between where the packet is going (network) and whose machine receives it (host).",
      }}
    />
  );
}
