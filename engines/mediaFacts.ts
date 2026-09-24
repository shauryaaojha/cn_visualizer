// ---------------------------------------------------------------------------
// mediaFacts — Inspector cards for everything clickable on the media canvas.
// Values come from the run's own inputs (the bit string, the noise level,
// the refractive indices, the rain), never from a textbook example.
// ---------------------------------------------------------------------------

import type { FactSpec } from "./lessonKit.ts";
import type { MediumAxis, MediumScore, SignalType } from "../types/visualization.ts";

export function bitFact(bits: string, i: number, type: SignalType): FactSpec {
  const b = bits[i];
  const prev = i > 0 ? bits[i - 1] : null;
  const rule =
    type === "nrz"
      ? b === "1"
        ? "high for the whole bit"
        : "low for the whole bit"
      : type === "manchester"
        ? b === "1"
          ? "low → high in the middle"
          : "high → low in the middle"
        : type === "am"
          ? b === "1"
            ? "large amplitude"
            : "small amplitude"
          : type === "fm"
            ? b === "1"
              ? "higher frequency"
              : "lower frequency"
            : "one of several amplitude/phase points";
  return {
    lead: `Bit ${i + 1} of ${bits.length} is a ${b}. In ${type.toUpperCase()} that is sent as: ${rule}.`,
    rows: [
      ["Value", b],
      ["Position", `${i + 1} of ${bits.length}`],
      ["Same as the bit before?", prev === null ? "— (first bit)" : prev === b ? "yes" : "no"],
      ...(type === "nrz" && prev !== null
        ? ([["Edge at its start?", prev === b ? "no — the line stays flat" : "yes"]] as [string, string][])
        : []),
      ...(type === "manchester" && prev !== null
        ? ([["Extra edge at its start?", prev === b ? "yes — to get back to the right starting level" : "no"]] as [string, string][])
        : []),
    ],
    remember:
      type === "manchester"
        ? "Manchester = a transition in the middle of every bit, so the receiver's clock never drifts."
        : type === "nrz"
          ? "NRZ = cheapest to send, but long runs of equal bits have no edges to sync on."
          : "Modulation puts digital bits onto an analog carrier the channel can carry.",
  };
}

export function wireFact(which: "A" | "B" | "noise" | "receiver", noise: number, twistRate: number): FactSpec {
  const N = noise.toFixed(1);
  switch (which) {
    case "A":
      return {
        lead: "Wire A carries the signal as it is: +V.",
        rows: [["Clean", "+V"], ["With noise", `+V + ${N}N`]],
        remember: "Differential signalling: the information is the difference between the two wires.",
      };
    case "B":
      return {
        lead: "Wire B carries the same signal inverted: −V.",
        rows: [["Clean", "−V"], ["With noise", `−V + ${N}N`]],
        remember: "B is the mirror of A, so the difference A − B is twice the signal.",
      };
    case "noise":
      return {
        lead: "Electromagnetic interference from motors, power cables and other pairs. It induces the same voltage in both wires, because the twists keep them equally close to the source.",
        rows: [["Induced on each wire", `${N}N`], ["Twist rate", `${twistRate} per metre`]],
        remember: "Twisting turns noise into common-mode noise — and common-mode noise cancels.",
      };
    case "receiver":
      return {
        lead: "The receiver subtracts B from A and throws everything else away.",
        rows: [
          ["A − B", `(+V + ${N}N) − (−V + ${N}N)`],
          ["= ", "2V"],
          ["Noise left", "0"],
        ],
        remember: "Common-mode rejection: what both wires share disappears.",
      };
  }
}

export const FIBER_PARTS: Record<string, { name: string; lead: string; remember: string }> = {
  core: {
    name: "Core",
    lead: "The glass the light travels in. Its refractive index n1 is slightly higher than the cladding's.",
    remember: "Core: ~9 µm in single-mode, ~50 µm in multi-mode.",
  },
  cladding: {
    name: "Cladding",
    lead: "Glass wrapped round the core with a slightly lower index n2. The boundary between them is the mirror.",
    remember: "n1 > n2 is the condition for total internal reflection.",
  },
  ray: {
    name: "Light ray",
    lead: "One path the light takes. Whether it survives each bounce depends only on the angle it meets the boundary at.",
    remember: "θ > θc → reflects 100%. θ < θc → leaks into the cladding.",
  },
  normal: {
    name: "Normal and critical angle",
    lead: "Angles are measured from the normal — the line at right angles to the boundary. θc = arcsin(n2/n1).",
    remember: "Critical angle = arcsin(n2 / n1).",
  },
};

export const WAVE_PARTS: Record<string, { name: string; lead: string; rows?: [string, string][]; remember: string }> = {
  ground: {
    name: "Ground wave",
    lead: "Low-frequency radio that follows the curve of the Earth.",
    rows: [["Band", "< 2 MHz"], ["Reach", "hundreds of km"], ["Example", "AM radio"]],
    remember: "Ground wave: low frequency, follows the Earth.",
  },
  sky: {
    name: "Sky wave",
    lead: "HF radio that reflects off the ionosphere and comes back down far away.",
    rows: [["Band", "2–30 MHz"], ["Reach", "thousands of km"], ["Example", "shortwave, ham radio"]],
    remember: "Sky wave: bounces off the ionosphere.",
  },
  space: {
    name: "Space wave",
    lead: "VHF and above: straight lines, line of sight, through walls.",
    rows: [["Band", "> 30 MHz"], ["Reach", "to the horizon"], ["Example", "FM, Wi-Fi, 4G/5G"]],
    remember: "Space wave: line of sight.",
  },
  ionosphere: {
    name: "Ionosphere",
    lead: "A layer of charged gas 60–1000 km up. It reflects HF radio back down and lets higher frequencies through.",
    remember: "Why shortwave can cross an ocean without a satellite.",
  },
  dish: {
    name: "Parabolic dish",
    lead: "Focuses microwaves into a narrow beam, so almost all the power goes where it's aimed.",
    remember: "Microwave = directional; radio = omnidirectional.",
  },
  relay: {
    name: "Relay tower",
    lead: "Receives the beam and re-sends it towards the next tower before the Earth's curve hides it.",
    rows: [["Spacing", "~50 km on land"]],
    remember: "Line of sight limits the hop length.",
  },
  rain: {
    name: "Rain fade",
    lead: "Raindrops are near the microwave wavelength, so they absorb and scatter the beam.",
    remember: "Every 3 dB of loss halves the received power.",
  },
  remote: {
    name: "IR transmitter",
    lead: "An LED flashing infrared light in a pattern that encodes the bits.",
    remember: "Infrared: line of sight, a few metres.",
  },
  wall: {
    name: "Wall",
    lead: "Opaque to infrared, just as it is to visible light.",
    remember: "No penetration → no interference between rooms, no eavesdropping.",
  },
  tv: {
    name: "IR receiver",
    lead: "A photodiode that only reacts to infrared it can see directly.",
    remember: "Same frequency in every room, and no conflict — because walls isolate them.",
  },
};

const AXIS_NAME: Record<MediumAxis, string> = {
  bandwidth: "Bandwidth",
  maxDistance: "Reach",
  emiImmunity: "Noise immunity",
  lowCost: "Low cost",
  security: "Security",
};

const USES: Record<string, string[]> = {
  "Twisted pair": ["Office Ethernet", "Telephone lines", "DSL"],
  Coaxial: ["Cable TV", "Cable broadband", "CCTV"],
  "Optical fibre": ["Internet backbone", "Submarine cables", "FTTH"],
  "Wi-Fi (radio)": ["Laptops", "Phones", "IoT"],
  Microwave: ["Cell backhaul", "Point-to-point links"],
  Satellite: ["Remote areas", "Ships", "TV broadcast"],
};

export function mediumFact(m: MediumScore): FactSpec {
  const axes = Object.keys(AXIS_NAME) as MediumAxis[];
  const best = axes.reduce((a, b) => (m[b] > m[a] ? b : a));
  const worst = axes.reduce((a, b) => (m[b] < m[a] ? b : a));
  return {
    lead: `${m.name}: strongest on ${AXIS_NAME[best].toLowerCase()}, weakest on ${AXIS_NAME[worst].toLowerCase()}.`,
    rows: axes.map((a) => [AXIS_NAME[a], `${m[a]} / 10`] as [string, string]),
    chips: USES[m.name] ? [{ label: "Used for", items: USES[m.name] }] : undefined,
    remember: "Scores are relative, for comparison — not measurements.",
  };
}
