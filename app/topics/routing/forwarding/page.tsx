import { CategoryHub } from "@/components/topic/CategoryHub";

export default function Hub() {
  return <CategoryHub section="routing" category="forwarding" cardsHeading="Follow one decision at a time" note={{ question: "How can a router send traffic across a network it has never seen?", problem: "No router carries the whole Internet in its head, so a destination address alone is not a complete travel plan.", idea: "It reads the most specific matching line in its own table, spends one TTL, and hands the packet to the next router. Forwarding is many small local decisions, not one giant journey." }} />;
}
