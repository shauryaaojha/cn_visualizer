import { CategoryHub } from "@/components/topic/CategoryHub";

export default function Hub() {
  return (
    <CategoryHub
      section="fundamentals"
      category="transmission-media"
      cardsHeading="Guided Transmission Media"
      note={{
        question: "How do physical conductors contain electromagnetic energy?",
        problem:
          "Signals traveling along cables suffer attenuation, crosstalk, and external electromagnetic interference (EMI).",
        idea:
          "Twisting cancels differential noise, coaxial shields drain EMI to ground, and fiber optic cladding traps light via Total Internal Reflection.",
      }}
    />
  );
}
