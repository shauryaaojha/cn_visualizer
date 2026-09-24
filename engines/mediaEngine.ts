// ---------------------------------------------------------------------------
// mediaEngine — the physical layer: how bits become voltage, light and radio.
//
// Every lesson is a short sequence of frames that reveals one idea at a time
// (a `phase` and a `focus` the canvas highlights), with Predict questions on
// the moments that decide something: which way a Manchester bit swings, what
// the differential receiver outputs, whether a ray stays in the core.
//
// Engines hold data only. Waveforms, cable cross-sections and ray paths are
// drawn by MediaCanvas from these numbers, so a changed input changes the
// picture and the maths together.
// ---------------------------------------------------------------------------

import type {
  CoaxLayer,
  MediaOperationId,
  MediaProgram,
  MediaStep,
  MediumAxis,
  MediumScore,
  SignalType,
} from "@/types/visualization";
import { ask } from "./lessonKit.ts";

export interface MediaRunParams {
  op: MediaOperationId;
  signalType?: SignalType;
  twistRate?: number; // 1–20
  noiseLevel?: number; // 0–1
  coreIndex?: number; // 1.45–1.60
  claddingIndex?: number; // 1.40–1.50
  launchAngleDeg?: number; // 0–90, from the normal
  fiberMode?: "smf" | "mmf";
  rainIntensity?: number; // 0–1
}

export const MEDIA_DEFAULTS: MediaRunParams = {
  op: "signalBasics",
  signalType: "manchester",
  twistRate: 8,
  noiseLevel: 0.5,
  coreIndex: 1.48,
  claddingIndex: 1.46,
  launchAngleDeg: 83,
  fiberMode: "smf",
  rainIntensity: 0.2,
};

export const MEDIA_BITS = "10110010";

/** Longest run of identical bits — where NRZ gives the receiver no edge to sync on. */
export function longestRun(bits: string): number {
  let best = 1;
  let cur = 1;
  for (let i = 1; i < bits.length; i++) {
    cur = bits[i] === bits[i - 1] ? cur + 1 : 1;
    best = Math.max(best, cur);
  }
  return best;
}

/** Voltage level changes an encoding produces for a bit string. */
export function transitions(bits: string, type: SignalType): number {
  if (type === "manchester") {
    // One in the middle of every bit, plus one at a boundary between equal bits.
    let n = bits.length;
    for (let i = 1; i < bits.length; i++) if (bits[i] === bits[i - 1]) n++;
    return n;
  }
  let n = 0;
  for (let i = 1; i < bits.length; i++) if (bits[i] !== bits[i - 1]) n++;
  return n;
}

// --- signal basics -----------------------------------------------------------

const SIGNAL_CODE = [
  "NRZ-L:       1 = high voltage, 0 = low voltage, for the whole bit",
  "Manchester:  every bit has a transition in the middle",
  "             1 = low → high,  0 = high → low   (IEEE 802.3)",
  "Analog:      carrier s(t) = A · sin(2πft + φ)",
  "             AM changes A, FM changes f, QAM changes A and φ",
];

function signalBasics(p: MediaRunParams): MediaProgram {
  const type = p.signalType ?? "manchester";
  const bits = MEDIA_BITS;
  const digital = type === "nrz" || type === "manchester";
  const wf = (drawn: number) => ({ signalType: type, bits, drawn });
  const steps: MediaStep[] = [];
  const name = { nrz: "NRZ-L", manchester: "Manchester", am: "AM", fm: "FM", qam: "QAM" }[type];

  if (digital) {
    steps.push({
      kind: "waveform",
      phase: 0,
      waveform: wf(0),
      focus: "bits",
      label: "bits",
      description: `Eight bits to send: ${bits}. A copper wire cannot carry a "1" — only a voltage. The encoding decides which voltage pattern stands for which bit.`,
      codeLines: type === "nrz" ? [1] : [2, 3],
    });
    steps.push({
      kind: "waveform",
      phase: 1,
      waveform: wf(1),
      focus: "bit-0",
      label: "bit 1",
      description:
        type === "nrz"
          ? "The first bit is a 1, so NRZ-L holds the line high for the whole bit time."
          : "The first bit is a 1. Manchester starts it low and swings high exactly halfway through the bit.",
      codeLines: type === "nrz" ? [1] : [2, 3],
      predict:
        type === "nrz"
          ? ask(
              "NRZ-L is about to send a 1. What does the voltage do during that bit?",
              "Stays high for the whole bit",
              ["Stays low for the whole bit", "Swings low → high in the middle", "Swings high → low in the middle"],
              "NRZ-L simply maps 1 to one level and 0 to the other; nothing changes mid-bit.",
              1,
            )
          : ask(
              "Manchester is about to send a 1. What happens in the middle of the bit?",
              "The voltage swings low → high",
              ["The voltage swings high → low", "It stays high", "Nothing — it waits for the next bit"],
              "IEEE 802.3 Manchester: a 1 is low → high and a 0 is high → low. There is always a transition mid-bit.",
              2,
            ),
    });
    steps.push({
      kind: "waveform",
      phase: 2,
      waveform: wf(bits.length),
      focus: "wave",
      label: "all 8",
      description: `All ${bits.length} bits drawn. ${
        type === "nrz"
          ? "Notice the flat stretches wherever the same bit repeats."
          : "Every single bit has an edge in its middle — including the runs of equal bits."
      }`,
      codeLines: type === "nrz" ? [1] : [2, 3],
    });
    const run = longestRun(bits);
    const edges = transitions(bits, type);
    steps.push({
      kind: "waveform",
      phase: 3,
      waveform: wf(bits.length),
      focus: "clock",
      label: "clock",
      description:
        type === "nrz"
          ? `The receiver keeps time by watching for edges. NRZ-L gives it only ${edges} edges in 8 bits, and ${run} bits in a row with none at all. A long run of 0s would let its clock drift and miscount bits.`
          : `Manchester gives the receiver ${edges} edges in 8 bits — at least one per bit — so its clock can resynchronise on every bit. The price: twice as many level changes, so it needs twice the bandwidth.`,
      codeLines: type === "nrz" ? [1] : [2],
      message: {
        text: type === "nrz" ? `NRZ-L: ${edges} edges, flat for up to ${run} bits` : `Manchester: ${edges} edges — self-clocking`,
        tone: type === "nrz" ? "warn" : "ok",
      },
      predict: ask(
        `How many voltage changes does ${name} produce for ${bits}?`,
        String(edges),
        [String(bits.length), String(edges + 2), String(Math.max(1, edges - 3)), String(transitions(bits, type === "nrz" ? "manchester" : "nrz"))],
        type === "nrz"
          ? "NRZ only changes level when the bit value changes."
          : "Manchester always changes mid-bit, and adds an extra change at the boundary between two equal bits.",
        edges,
      ),
    });
  } else {
    const what = { am: "amplitude (height)", fm: "frequency (how tightly packed the waves are)", qam: "both amplitude and phase" }[type];
    steps.push({
      kind: "waveform",
      phase: 0,
      waveform: wf(0),
      focus: "carrier",
      label: "carrier",
      description: "A radio or cable channel carries a sine wave — the carrier. On its own it carries no information: every cycle is identical.",
      codeLines: [4],
    });
    steps.push({
      kind: "waveform",
      phase: 1,
      waveform: wf(bits.length),
      focus: "wave",
      label: name,
      description: `${name} carries the bits by changing the carrier's ${what}. The receiver compares each symbol with the plain carrier to read the bit back.`,
      codeLines: [4, 5],
      predict: ask(
        `In ${name}, which property of the carrier changes to encode a 1 versus a 0?`,
        type === "am" ? "Amplitude" : type === "fm" ? "Frequency" : "Amplitude and phase",
        ["Amplitude", "Frequency", "Phase only", "Amplitude and phase"],
        `${name} = ${type === "am" ? "amplitude" : type === "fm" ? "frequency" : "quadrature amplitude"} modulation.`,
        type === "fm" ? 0 : 2,
      ),
    });
    steps.push({
      kind: "waveform",
      phase: 2,
      waveform: wf(bits.length),
      focus: "compare",
      label: "trade-off",
      description:
        type === "qam"
          ? "QAM packs several bits into each symbol by combining amplitude and phase — how Wi-Fi and cable modems get their speed. More levels means less room for noise."
          : type === "am"
            ? "AM is simple, but noise also changes amplitude, so AM is the easiest of the three to corrupt."
            : "FM is more robust to noise than AM, because noise mostly disturbs amplitude, not frequency.",
      codeLines: [5],
      message: { text: `${name}: bits ride on the carrier's ${type === "qam" ? "amplitude + phase" : type === "am" ? "amplitude" : "frequency"}`, tone: "ok" },
    });
  }

  return {
    steps,
    title: `Signal Encoding — ${name}`,
    pseudocode: SIGNAL_CODE,
    stats: [
      { label: "Bits", value: bits, tone: "signal" },
      { label: "Encoding", value: name, tone: "mint" },
      ...(digital
        ? [
            { label: "Edges", value: String(transitions(bits, type)), tone: "amber" as const },
            { label: "Self-clocking", value: type === "manchester" ? "yes" : "no", tone: type === "manchester" ? ("mint" as const) : ("coral" as const) },
          ]
        : [{ label: "Changes", value: type === "am" ? "amplitude" : type === "fm" ? "frequency" : "amplitude + phase", tone: "amber" as const }]),
    ],
  };
}

// --- twisted pair --------------------------------------------------------------

const TP_CODE = [
  "wire A carries +V, wire B carries −V (differential signalling)",
  "noise N couples into BOTH wires equally",
  "receiver outputs A − B = (+V + N) − (−V + N) = 2V",
  "twisting keeps both wires equally close to any noise source",
];

function twistedPair(p: MediaRunParams): MediaProgram {
  const twistRate = Math.max(1, Math.min(20, p.twistRate ?? 8));
  const n = Math.max(0, Math.min(1, p.noiseLevel ?? 0.5));
  const N = n.toFixed(1);
  const tp = { twistRate, noiseLevel: n };
  const cat = twistRate >= 12 ? "Cat 6A (10 Gbps)" : twistRate >= 6 ? "Cat 5e/6 (1 Gbps)" : "Cat 3 (10 Mbps)";
  const steps: MediaStep[] = [
    {
      kind: "twistedPair",
      twistedPair: tp,
      phase: 0,
      focus: "wires",
      label: "±V",
      description: "One signal, two wires. Wire A carries the signal as +V and wire B carries its mirror image, −V. The receiver only ever looks at the difference between them.",
      codeLines: [1],
    },
    {
      kind: "twistedPair",
      twistedPair: tp,
      phase: 1,
      focus: "noise",
      label: "noise",
      description: `A motor nearby induces noise of ${N}N. Because the wires are twisted together, both pick up the same ${N}N: A now reads +V + ${N}N, and B reads −V + ${N}N.`,
      codeLines: [2],
      message: { text: `+${N}N of interference on both wires`, tone: "warn" },
    },
    {
      kind: "twistedPair",
      twistedPair: tp,
      phase: 2,
      focus: "receiver",
      label: "A − B",
      description: `The receiver subtracts: (+V + ${N}N) − (−V + ${N}N) = 2V. The noise appears in both terms, so it cancels exactly and the signal comes out doubled.`,
      codeLines: [3],
      message: { text: "Noise cancelled — output is a clean 2V", tone: "ok" },
      predict: ask(
        `Both wires picked up ${N}N of noise. What does the receiver get when it computes A − B?`,
        "2V — the noise cancels",
        [`2V + ${(n * 2).toFixed(1)}N`, `${N}N`, "0V — the signals cancel"],
        "Anything that hits both wires equally (common-mode noise) disappears in the subtraction; the signal, which is opposite on the two wires, adds up.",
        1,
      ),
    },
    {
      kind: "twistedPair",
      twistedPair: tp,
      phase: 3,
      focus: "twists",
      label: "twists",
      description: `Why twist? Untwisted, one wire would sit closer to the noise and pick up more of it — and then A − B would not cancel. At ${twistRate} twists per metre each wire spends equal time on each side. Tighter twists (as in ${cat}) keep that true at higher frequencies.`,
      codeLines: [4],
      predict: ask(
        "What is the twist actually for?",
        "Both wires pick up the same noise",
        ["It makes the cable stronger", "It stops the wires touching", "It makes the cable shorter"],
        "Cancellation only works if the noise on A and B is identical. Twisting averages out which wire is nearer the source.",
        3,
      ),
    },
  ];
  return {
    steps,
    title: "Twisted Pair — Noise Cancellation",
    pseudocode: TP_CODE,
    stats: [
      { label: "Twist rate", value: `${twistRate} /m`, tone: "signal" },
      { label: "Noise", value: `${N}N`, tone: "coral" },
      { label: "Output", value: "2V (clean)", tone: "mint" },
      { label: "Grade", value: cat, tone: "amber" },
      { label: "Max length", value: "100 m", tone: "signal" },
    ],
  };
}

// --- coaxial -------------------------------------------------------------------

export const COAX_LAYERS: CoaxLayer[] = [
  { id: "core", name: "Centre conductor", material: "solid copper", purpose: "Carries the signal.", radius: 7, color: "#F0D264" },
  { id: "dielectric", name: "Dielectric insulator", material: "foam polyethylene", purpose: "Holds the core exactly in the centre, which fixes the impedance (50 Ω or 75 Ω).", radius: 22, color: "#DCD8C8" },
  { id: "shield", name: "Braided shield", material: "copper braid / foil", purpose: "A Faraday cage: outside noise lands on it and drains to ground.", radius: 30, color: "#9FB3AA" },
  { id: "jacket", name: "Outer jacket", material: "PVC", purpose: "Protects everything inside from water, bending and wear.", radius: 38, color: "#2E604C" },
];

const COAX_CODE = [
  "core:       copper wire that carries the signal",
  "dielectric: insulator that keeps the core centred",
  "shield:     braid around it — a Faraday cage, grounded",
  "jacket:     plastic protection",
  "noise hits the shield and drains to ground",
];

function coaxial(): MediaProgram {
  const coax = { layers: COAX_LAYERS };
  const steps: MediaStep[] = COAX_LAYERS.map((l, i) => ({
    kind: "coaxial" as const,
    coaxial: coax,
    phase: i,
    focus: l.id,
    label: l.id,
    description: `${l.name} (${l.material}). ${l.purpose}`,
    codeLines: [i + 1],
  }));
  steps.push({
    kind: "coaxial",
    coaxial: coax,
    phase: 4,
    focus: "noise",
    label: "noise",
    description: "Interference arrives from outside. It meets the braided shield first, which carries it away to ground before it ever reaches the centre conductor. That is why coax can run hundreds of metres carrying cable TV and broadband.",
    codeLines: [5],
    message: { text: "Noise stopped at the shield", tone: "ok" },
    predict: ask(
      "Noise hits the outside of the cable. Which layer stops it reaching the signal?",
      "The braided shield",
      ["The outer jacket", "The dielectric", "The centre conductor"],
      "The shield is a grounded conductor wrapped all the way round — a Faraday cage. Plastic (jacket, dielectric) does not stop electromagnetic noise.",
      2,
    ),
  });
  return {
    steps,
    title: "Coaxial Cable — Layers and Shielding",
    pseudocode: COAX_CODE,
    stats: [
      { label: "Layers", value: "4", tone: "signal" },
      { label: "Impedance", value: "50 / 75 Ω", tone: "amber" },
      { label: "Reach", value: "~500 m", tone: "mint" },
      { label: "Used for", value: "cable TV, DOCSIS", tone: "signal" },
    ],
  };
}

// --- optical fibre ---------------------------------------------------------------

const FIBER_CODE = [
  "core index n1 must be greater than cladding index n2",
  "critical angle θc = arcsin(n2 / n1)",
  "if the ray hits the boundary at θ > θc  (from the normal):",
  "    total internal reflection — the light stays in the core",
  "else: part of it refracts into the cladding and is lost",
];

export function criticalAngle(n1: number, n2: number): number {
  return n2 >= n1 ? 90 : (Math.asin(n2 / n1) * 180) / Math.PI;
}

function fiber(p: MediaRunParams): MediaProgram {
  const n1 = p.coreIndex ?? 1.48;
  const n2 = p.claddingIndex ?? 1.46;
  const theta = Math.max(0, Math.min(90, p.launchAngleDeg ?? 83));
  const mode = p.fiberMode ?? "smf";
  const crit = criticalAngle(n1, n2);
  const isTIR = n1 > n2 && theta > crit;
  const optics = { coreIndex: n1, claddingIndex: n2, criticalAngleDeg: Math.round(crit * 10) / 10, launchAngleDeg: theta, isTIR, mode };
  const c = crit.toFixed(1);
  const steps: MediaStep[] = [
    {
      kind: "rayOptics",
      rayOptics: optics,
      phase: 0,
      focus: "glass",
      label: "n1 > n2",
      description: `A glass core (n1 = ${n1}) inside a glass cladding with a slightly lower index (n2 = ${n2}). ${n1 > n2 ? "That small difference is what traps the light." : "With n1 ≤ n2 nothing can be trapped — the core must be the denser glass."}`,
      codeLines: [1],
    },
    {
      kind: "rayOptics",
      rayOptics: optics,
      phase: 1,
      focus: "critical",
      label: "θc",
      description: `The critical angle is arcsin(n2 / n1) = arcsin(${n2} / ${n1}) = ${c}°. Any ray that meets the boundary at more than ${c}° from the normal cannot get out.`,
      codeLines: [2],
      predict: ask(
        `n1 = ${n1}, n2 = ${n2}. Roughly what is the critical angle?`,
        `${c}°`,
        [`${(90 - crit).toFixed(1)}°`, "45.0°", `${Math.max(1, crit - 12).toFixed(1)}°`],
        `θc = arcsin(n2/n1) = arcsin(${(n2 / n1).toFixed(4)}) = ${c}°. The closer n2 is to n1, the closer θc gets to 90°.`,
        1,
      ),
    },
    {
      kind: "rayOptics",
      rayOptics: optics,
      phase: 2,
      focus: "ray",
      label: isTIR ? "TIR ✓" : "escapes",
      description: isTIR
        ? `The ray hits the boundary at ${theta}°, more than ${c}°, so all of it reflects back into the core — total internal reflection. It zig-zags down the fibre with almost no loss.`
        : `The ray hits the boundary at ${theta}°, less than ${c}°, so part of it refracts out into the cladding and is absorbed. Each bounce loses more; the signal dies.`,
      codeLines: isTIR ? [3, 4] : [3, 5],
      message: isTIR ? { text: `θ = ${theta}° > θc = ${c}° — light trapped`, tone: "ok" } : { text: `θ = ${theta}° < θc = ${c}° — light escapes`, tone: "error" },
      predict: ask(
        `The ray meets the boundary at ${theta}° from the normal, and θc = ${c}°. What happens?`,
        isTIR ? "It reflects completely — stays in the core" : "It escapes into the cladding",
        ["It reflects completely — stays in the core", "It escapes into the cladding", "It stops dead at the boundary"],
        isTIR ? "Above the critical angle there is no refracted ray at all: 100% reflects." : "Below the critical angle some light always refracts out.",
        0,
      ),
    },
    {
      kind: "rayOptics",
      rayOptics: optics,
      phase: 3,
      focus: "mode",
      label: mode.toUpperCase(),
      description:
        mode === "smf"
          ? "Single-mode fibre has a core only ~9 µm wide, so just one path fits. Every photon travels the same distance — no spreading — which is why it reaches 100 km and beyond."
          : "Multi-mode fibre has a ~50 µm core that lets many ray paths through. Steep rays travel further than shallow ones, so a pulse spreads out (modal dispersion) and reach drops to a few hundred metres.",
      codeLines: [4],
    },
  ];
  return {
    steps,
    title: `Optical Fibre — Total Internal Reflection (${mode.toUpperCase()})`,
    pseudocode: FIBER_CODE,
    stats: [
      { label: "Core n1", value: String(n1), tone: "signal" },
      { label: "Cladding n2", value: String(n2), tone: "signal" },
      { label: "Critical angle", value: `${c}°`, tone: "amber" },
      { label: "Result", value: isTIR ? "trapped (TIR)" : "leaks out", tone: isTIR ? "mint" : "coral" },
    ],
  };
}

// --- unguided --------------------------------------------------------------------

const RADIO_CODE = [
  "ground wave  (< 2 MHz):   follows the Earth's curve — AM radio",
  "sky wave     (2–30 MHz):  bounces off the ionosphere — shortwave",
  "space wave   (> 30 MHz):  line of sight, through walls — FM, Wi-Fi, 4G/5G",
];

function radio(): MediaProgram {
  const aw = { type: "radio" as const, frequencyLabel: "3 kHz – 1 GHz", rangeLabel: "omnidirectional" };
  const steps: MediaStep[] = [
    {
      kind: "antennaWave",
      antennaWave: aw,
      phase: 0,
      focus: "ground",
      label: "ground",
      description: "Radio antennas radiate in every direction. Low frequencies (below 2 MHz) hug the ground and bend around the Earth's curve — how AM stations cover a region.",
      codeLines: [1],
    },
    {
      kind: "antennaWave",
      antennaWave: aw,
      phase: 1,
      focus: "sky",
      label: "sky",
      description: "Between 2 and 30 MHz, waves go up and bounce off the ionosphere, landing hundreds or thousands of km away — shortwave radio crosses oceans this way with no satellite.",
      codeLines: [2],
      predict: ask(
        "Which radio waves can bounce off the ionosphere to reach another continent?",
        "HF, 2–30 MHz (sky wave)",
        ["Below 2 MHz (ground wave)", "Above 30 MHz (space wave)", "Infrared"],
        "The ionosphere reflects HF. Higher frequencies punch straight through it into space.",
        1,
      ),
    },
    {
      kind: "antennaWave",
      antennaWave: aw,
      phase: 2,
      focus: "space",
      label: "space",
      description: "Above 30 MHz, waves travel in straight lines (line of sight) but pass through walls — FM radio, Wi-Fi, 4G and 5G. Great for mobility, easy to overhear.",
      codeLines: [3],
      message: { text: "Omnidirectional — anyone in range can listen", tone: "warn" },
      predict: ask(
        "Your 2.4 GHz Wi-Fi signal — how does it travel?",
        "Line of sight, and through walls",
        ["Along the Earth's curve", "Off the ionosphere", "Only through a cable"],
        "2.4 GHz is well above 30 MHz: a space wave.",
        2,
      ),
    },
  ];
  return {
    steps,
    title: "Radio Waves — Three Ways to Travel",
    pseudocode: RADIO_CODE,
    stats: [
      { label: "Frequency", value: "3 kHz – 1 GHz", tone: "signal" },
      { label: "Direction", value: "omnidirectional", tone: "mint" },
      { label: "Walls", value: "passes through", tone: "mint" },
    ],
  };
}

const MICRO_CODE = [
  "microwaves: 1–300 GHz, focused by dish antennas",
  "needs line of sight between the two dishes",
  "the Earth curves away → relay towers every ~50 km",
  "rain absorbs and scatters the beam → rain fade (dB lost)",
];

function microwave(p: MediaRunParams): MediaProgram {
  const rain = Math.max(0, Math.min(1, p.rainIntensity ?? 0.2));
  const db = Math.round(rain * 15 * 10) / 10;
  const kept = Math.pow(10, -db / 10) * 100;
  const aw = { type: "microwave" as const, frequencyLabel: "1 – 300 GHz", rangeLabel: "line of sight", rainAttenuationDb: db };
  const steps: MediaStep[] = [
    {
      kind: "antennaWave",
      antennaWave: aw,
      phase: 0,
      focus: "beam",
      label: "beam",
      description: "Microwaves are focused into a narrow beam between two dish antennas. Narrow means efficient and hard to eavesdrop on — but the dishes must see each other.",
      codeLines: [1, 2],
    },
    {
      kind: "antennaWave",
      antennaWave: aw,
      phase: 1,
      focus: "relay",
      label: "relays",
      description: "The Earth curves away beneath a straight beam, so on land the dishes sit on tall towers and the link is relayed every ~50 km. A satellite is just a very tall relay.",
      codeLines: [3],
      predict: ask(
        "Why do microwave links need a relay tower every ~50 km?",
        "The Earth curves away from the straight beam",
        ["The signal runs out of bandwidth", "Birds block the beam", "Regulations require it"],
        "Microwaves travel in straight lines and don't bend with the Earth, so towers must stay within each other's line of sight.",
        0,
      ),
    },
    {
      kind: "antennaWave",
      antennaWave: aw,
      phase: 2,
      focus: "rain",
      label: "rain fade",
      description: `Rain at intensity ${rain.toFixed(1)} costs ${db} dB — only ${kept.toFixed(kept < 10 ? 1 : 0)}% of the power gets through. Raindrops are close in size to the wavelength, so they absorb and scatter the beam.`,
      codeLines: [4],
      message: { text: `Rain fade −${db} dB → ${kept.toFixed(kept < 10 ? 1 : 0)}% of the power arrives`, tone: rain > 0.5 ? "error" : "warn" },
      predict: ask(
        `Rain costs this link ${db} dB. Roughly what share of the power still arrives?`,
        `${kept.toFixed(kept < 10 ? 1 : 0)}%`,
        [`${Math.min(99, 100 - db).toFixed(0)}%`, "0%", `${(kept / 2).toFixed(kept < 20 ? 1 : 0)}%`],
        `dB is logarithmic: power kept = 10^(−dB/10) = 10^(−${(db / 10).toFixed(2)}). Every 3 dB halves the power.`,
        2,
      ),
    },
  ];
  return {
    steps,
    title: "Microwaves — Line of Sight and Rain Fade",
    pseudocode: MICRO_CODE,
    stats: [
      { label: "Frequency", value: "1 – 300 GHz", tone: "signal" },
      { label: "Relay every", value: "~50 km", tone: "amber" },
      { label: "Rain fade", value: `−${db} dB`, tone: rain > 0.5 ? "coral" : "amber" },
      { label: "Power kept", value: `${kept.toFixed(kept < 10 ? 1 : 0)}%`, tone: "mint" },
    ],
  };
}

const IR_CODE = [
  "infrared: 300 GHz – 400 THz, just below visible light",
  "cannot pass through walls",
  "so each room is its own private channel — no licence needed",
];

function infrared(): MediaProgram {
  const aw = { type: "infrared" as const, frequencyLabel: "300 GHz – 400 THz", rangeLabel: "< 10 m, one room" };
  const steps: MediaStep[] = [
    {
      kind: "antennaWave",
      antennaWave: aw,
      phase: 0,
      focus: "beam",
      label: "beam",
      description: "A TV remote sends pulses of infrared — light just too red to see — straight at the TV.",
      codeLines: [1],
    },
    {
      kind: "antennaWave",
      antennaWave: aw,
      phase: 1,
      focus: "wall",
      label: "wall",
      description: "Infrared behaves like light: a wall stops it completely. The TV in the next room never sees your button press.",
      codeLines: [2],
      predict: ask(
        "Does the infrared signal reach the TV in the next room?",
        "No — the wall blocks it",
        ["Yes, walls barely weaken it", "Only if it bounces off the ceiling", "Yes, but more slowly"],
        "At infrared wavelengths a wall is opaque, exactly as it is to visible light.",
        1,
      ),
    },
    {
      kind: "antennaWave",
      antennaWave: aw,
      phase: 2,
      focus: "rooms",
      label: "privacy",
      description: "That weakness is also its strength: every room is a separate channel, nothing leaks to eavesdroppers, and no licence is needed. The cost is range — a few metres, line of sight.",
      codeLines: [3],
      message: { text: "Room-confined: private, interference-free, short range", tone: "ok" },
    },
  ];
  return {
    steps,
    title: "Infrared — One Room, One Channel",
    pseudocode: IR_CODE,
    stats: [
      { label: "Frequency", value: "300 GHz – 400 THz", tone: "signal" },
      { label: "Walls", value: "blocked", tone: "amber" },
      { label: "Range", value: "< 10 m", tone: "signal" },
      { label: "Security", value: "high", tone: "mint" },
    ],
  };
}

// --- comparison ------------------------------------------------------------------

export const MEDIA_SCORES: MediumScore[] = [
  { name: "Twisted pair", bandwidth: 7, maxDistance: 3, emiImmunity: 5, lowCost: 9, security: 5, color: "#F0D264" },
  { name: "Coaxial", bandwidth: 6, maxDistance: 5, emiImmunity: 7, lowCost: 7, security: 6, color: "#F0A868" },
  { name: "Optical fibre", bandwidth: 10, maxDistance: 10, emiImmunity: 10, lowCost: 3, security: 10, color: "#B9E39A" },
  { name: "Wi-Fi (radio)", bandwidth: 7, maxDistance: 2, emiImmunity: 4, lowCost: 8, security: 4, color: "#8FCBE0" },
  { name: "Microwave", bandwidth: 8, maxDistance: 7, emiImmunity: 6, lowCost: 5, security: 6, color: "#C9A8F5" },
  { name: "Satellite", bandwidth: 7, maxDistance: 9, emiImmunity: 6, lowCost: 2, security: 5, color: "#EDB0BA" },
];

export const AXES: { id: MediumAxis; name: string; why: string }[] = [
  { id: "bandwidth", name: "Bandwidth", why: "Light has an enormous usable frequency range, so fibre carries terabits." },
  { id: "maxDistance", name: "Reach", why: "Glass loses very little light per km; copper loses signal fast, radio spreads out." },
  { id: "emiImmunity", name: "Noise immunity", why: "Photons in glass are unaffected by electromagnetic noise — fibre has none to reject." },
  { id: "lowCost", name: "Low cost", why: "Twisted pair is cheap to buy, easy to terminate and every device already has the port." },
  { id: "security", name: "Security", why: "Tapping fibre means physically bending it, which the receiver notices as signal loss." },
];

const RADAR_CODE = ["score every medium 1–10 on each attribute", "compare one attribute at a time", "no medium wins everything — pick for the job"];

function comparison(): MediaProgram {
  const steps: MediaStep[] = [
    {
      kind: "comparisonRadar",
      comparisonRadar: { media: MEDIA_SCORES },
      phase: 0,
      label: "all",
      description: "Six media, five attributes, each scored 1–10. Before looking at each attribute, guess which medium wins it.",
      codeLines: [1],
    },
  ];
  AXES.forEach((ax, i) => {
    const best = [...MEDIA_SCORES].sort((a, b) => b[ax.id] - a[ax.id])[0];
    steps.push({
      kind: "comparisonRadar",
      comparisonRadar: { media: MEDIA_SCORES, axis: ax.id },
      phase: i + 1,
      focus: ax.id,
      label: ax.name.toLowerCase(),
      description: `${ax.name}: ${best.name} wins with ${best[ax.id]}/10. ${ax.why}`,
      codeLines: [2],
      predict: ask(
        `Which medium scores best on ${ax.name.toLowerCase()}?`,
        best.name,
        MEDIA_SCORES.filter((m) => m !== best).map((m) => m.name).sort((a, b) => a.length - b.length),
        ax.why,
        i + 1,
      ),
    });
  });
  steps.push({
    kind: "comparisonRadar",
    comparisonRadar: { media: MEDIA_SCORES },
    phase: AXES.length + 1,
    label: "verdict",
    description: "Fibre wins four of five — and loses on cost, which is why the last 100 m to your desk is still twisted pair, and the last 10 m to your phone is radio.",
    codeLines: [3],
    message: { text: "Fibre for the backbone, copper to the desk, radio to the phone", tone: "ok" },
  });
  return {
    steps,
    title: "Transmission Media — Head to Head",
    pseudocode: RADAR_CODE,
    stats: [
      { label: "Media", value: "6", tone: "signal" },
      { label: "Attributes", value: "5", tone: "signal" },
      { label: "Most wins", value: "Optical fibre", tone: "mint" },
      { label: "Cheapest", value: "Twisted pair", tone: "amber" },
    ],
  };
}

// --- dispatcher -----------------------------------------------------------------

export function runMediaOperation(p: MediaRunParams): MediaProgram {
  switch (p.op) {
    case "signalBasics":
      return signalBasics(p);
    case "guidedTwistedPair":
      return twistedPair(p);
    case "guidedCoaxial":
      return coaxial();
    case "guidedFiber":
      return fiber(p);
    case "unguidedRadio":
      return radio();
    case "unguidedMicrowave":
      return microwave(p);
    case "unguidedInfrared":
      return infrared();
    case "mediaComparison":
    default:
      return comparison();
  }
}
