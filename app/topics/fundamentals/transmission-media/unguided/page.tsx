import { CategoryHub } from "@/components/topic/CategoryHub";

export default function Hub() {
  return (
    <CategoryHub
      section="fundamentals"
      category="transmission-media"
      cardsHeading="Unguided (Wireless) Transmission Media"
      note={{
        question: "How do electromagnetic waves travel through unconfined space?",
        problem:
          "Wireless signals broadcast freely, competing with interference, atmospheric attenuation, and physical obstacles.",
        idea:
          "Radio waves bend and reflect off the ionosphere, microwaves require tight line-of-sight relays, and infrared provides room isolation.",
      }}
    />
  );
}
