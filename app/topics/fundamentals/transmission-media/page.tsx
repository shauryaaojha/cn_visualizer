import { CategoryHub } from "@/components/topic/CategoryHub";

export default function Hub() {
  return (
    <CategoryHub
      section="fundamentals"
      category="transmission-media"
      cardsHeading="Physical Transmission Media"
      note={{
        question: "How do 1s and 0s physically move through space?",
        problem:
          "Bits are abstract mathematical concepts. Physical wires, fibers, and antennas must turn them into voltage, light pulses, or electromagnetic waves.",
        idea:
          "Explore guided media (twisted pair, coaxial, optical fiber) and unguided free space (radio, microwave, infrared) with noise and refraction physics.",
      }}
    />
  );
}
