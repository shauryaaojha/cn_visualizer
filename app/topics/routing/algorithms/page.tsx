import { CategoryHub } from "@/components/topic/CategoryHub";

export default function Hub() {
  return <CategoryHub section="routing" category="algorithms" cardsHeading="Watch routers learn" note={{ question: "How does a router learn a route it cannot see directly?", problem: "A local table starts almost empty; every remote network is an unknown until a neighbour has something useful to say.", idea: "Routing algorithms turn small neighbour exchanges into a shared understanding of the network. Their speed, their failures and their safeguards all come from the rule they use to compare paths." }} />;
}
