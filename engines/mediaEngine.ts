// ---------------------------------------------------------------------------
// mediaEngine — physical transmission media pure engine.
//
// Generates deterministic frame programs for:
// - Signal basics (digital NRZ/Manchester and analog carrier modulation)
// - Guided media (Twisted pair cancellation, Coaxial shielding, Optical fiber TIR)
// - Unguided media (Radio wave propagation, Microwaves & rain fade, Infrared)
// - Master Media Comparison (Multi-axis benchmark matrix & radar metrics)
// ---------------------------------------------------------------------------

import type {
  MediaAntennaWave,
  MediaCoaxial,
  MediaComparisonRadar,
  MediaOperationId,
  MediaProgram,
  MediaRayOptics,
  MediaStep,
  MediaTwistedPair,
  MediaWaveform,
} from "@/types/visualization";

export interface MediaRunParams {
  op: MediaOperationId;
  signalType?: "nrz" | "manchester" | "am" | "fm" | "qam";
  twistRate?: number; // 1-20
  noiseLevel?: number; // 0-1
  coreIndex?: number; // 1.45 - 1.60
  claddingIndex?: number; // 1.40 - 1.50
  launchAngleDeg?: number; // 0 - 90
  fiberMode?: "smf" | "mmf";
  rainIntensity?: number; // 0-1
  activeLayerIndex?: number;
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
  activeLayerIndex: 0,
};

// --- Operation: Signal Basics -----------------------------------------------

const SIGNAL_CODE = [
  "Digital Encoding: NRZ-L (High=1, Low=0) vs Manchester (Mid-bit transition)",
  "Manchester Encoding guarantees self-clocking on every bit",
  "Analog Modulation: Carrier wave s(t) = A * sin(2*pi*f*t + phi)",
  "Modulate Amplitude (AM), Frequency (FM), or Phase (PSK/QAM)",
];

function signalBasics(p: MediaRunParams): MediaProgram {
  const signalType = p.signalType || "manchester";
  const bits = "10110010";

  // Build SVG path representation for waveform
  let waveSvgPath = "";
  const stepW = 50;
  const highY = 20;
  const lowY = 80;
  const midY = 50;

  if (signalType === "nrz") {
    let currX = 20;
    let prevY = bits[0] === "1" ? highY : lowY;
    waveSvgPath = `M ${currX} ${prevY}`;
    for (let i = 0; i < bits.length; i++) {
      const bit = bits[i];
      const y = bit === "1" ? highY : lowY;
      waveSvgPath += ` L ${currX} ${y} L ${currX + stepW} ${y}`;
      currX += stepW;
      prevY = y;
    }
  } else if (signalType === "manchester") {
    let currX = 20;
    waveSvgPath = `M ${currX} ${bits[0] === "1" ? lowY : highY}`;
    for (let i = 0; i < bits.length; i++) {
      const bit = bits[i];
      const startY = bit === "1" ? lowY : highY;
      const endY = bit === "1" ? highY : lowY;
      waveSvgPath += ` L ${currX} ${startY} L ${currX + stepW / 2} ${startY} L ${currX + stepW / 2} ${endY} L ${currX + stepW} ${endY}`;
      currX += stepW;
    }
  } else {
    // Carrier wave sine
    let currX = 20;
    waveSvgPath = `M ${currX} ${midY}`;
    for (let x = 0; x <= 400; x += 4) {
      const amp = signalType === "am" ? (Math.sin(x / 40) > 0 ? 30 : 10) : 25;
      const freq = signalType === "fm" ? (Math.sin(x / 40) > 0 ? 0.2 : 0.08) : 0.12;
      const y = midY + amp * Math.sin(x * freq);
      waveSvgPath += ` L ${currX + x} ${y}`;
    }
  }

  const clockSvgPath = "M 20 50 L 420 50";

  const waveform: MediaWaveform = {
    signalType,
    bits,
    waveSvgPath,
    clockSvgPath,
  };

  const steps: MediaStep[] = [
    {
      kind: "waveform",
      waveform,
      description:
        signalType === "manchester"
          ? "Manchester Encoding: Bit 0 is High-to-Low transition; Bit 1 is Low-to-High transition. Because every bit has a transition in the exact middle, the receiver's clock stays 100% synchronized with zero baseline wander."
          : signalType === "nrz"
            ? "Non-Return to Zero (NRZ-L): 1 is High voltage, 0 is Low voltage. Simple and bandwidth efficient, but consecutive identical bits (e.g. 000000) have no transitions and cause receiver clock drift."
            : `Analog Carrier Modulation (${signalType.toUpperCase()}): Information is impressed onto a high-frequency sinusoidal carrier wave for transmission over wireless or bandpass channels.`,
      codeLines: signalType === "manchester" ? [1, 2] : [3, 4],
      message: {
        text: `Signal Encoding: ${signalType.toUpperCase()} for bits "${bits}"`,
        tone: "ok",
      },
    },
  ];

  return {
    steps,
    title: `Signal Encoding & Modulation — ${signalType.toUpperCase()}`,
    pseudocode: SIGNAL_CODE,
    stats: [
      { label: "Bits", value: bits, tone: "signal" },
      { label: "Encoding", value: signalType.toUpperCase(), tone: "mint" },
      { label: "Self-Clocking", value: signalType === "manchester" ? "Yes (100%)" : "No", tone: signalType === "manchester" ? "mint" : "amber" },
      { label: "DC Component", value: signalType === "manchester" ? "Zero DC" : "Present", tone: "signal" },
    ],
  };
}

// --- Operation: Guided Media — Twisted Pair ---------------------------------

const TP_CODE = [
  "Differential Signaling: Wire A = +V, Wire B = -V",
  "External Electromagnetic Interference (EMI) injects equal noise +N into both wires",
  "Receiver calculates difference: V_out = (Wire_A) - (Wire_B)",
  "  V_out = (+V + N) - (-V + N) = 2V  --> NOISE CANCELLED!",
  "Twisting ensures both wires spend equal time close to external noise source",
];

function guidedTwistedPair(p: MediaRunParams): MediaProgram {
  const twistRate = p.twistRate ?? 8;
  const noise = p.noiseLevel ?? 0.5;

  const wireAPath = `M 20 40 Q 100 ${40 - twistRate * 2} 180 40 T 340 40 T 500 40`;
  const wireBPath = `M 20 60 Q 100 ${60 + twistRate * 2} 180 60 T 340 60 T 500 60`;

  const twistedPair: MediaTwistedPair = {
    twistRate,
    noiseLevel: noise,
    wireAPath,
    wireBPath,
    diffOutput: `(+V + ${noise.toFixed(2)}N) - (-V + ${noise.toFixed(2)}N) = 2.00V (Clean)`,
    cancelled: true,
  };

  const steps: MediaStep[] = [
    {
      kind: "twistedPair",
      twistedPair,
      description: `Why Twisted Pair Works: External electromagnetic noise couples equally into both wires. The differential receiver subtracts Wire B from Wire A: $(+V + ${noise.toFixed(1)}N) - (-V + ${noise.toFixed(1)}N) = 2V$. The noise is mathematically annihilated! More twists per meter enable higher data rates (Cat 5e: 1 Gbps, Cat 6A: 10 Gbps).`,
      codeLines: [1, 2, 3, 4, 5],
      message: { text: "Common-Mode Rejection Ratio (CMRR) > 60 dB · Noise Cancelled", tone: "ok" },
    },
  ];

  return {
    steps,
    title: "Twisted Pair Cable (UTP / STP) — Noise Cancellation",
    pseudocode: TP_CODE,
    stats: [
      { label: "Twist Rate", value: `${twistRate} twists/m`, tone: "signal" },
      { label: "Noise Reduction", value: "> 99.4%", tone: "mint" },
      { label: "Bandwidth", value: "Cat 6A (10 Gbps)", tone: "mint" },
      { label: "Max Distance", value: "100 meters", tone: "amber" },
    ],
  };
}

// --- Operation: Guided Media — Coaxial Cable --------------------------------

const COAX_CODE = [
  "1. Center Copper Core: carries high frequency electrical signal",
  "2. Dielectric Insulator: maintains exact concentric geometry",
  "3. Metallic Braided Shield (Faraday Cage): grounds external EMI & crosstalk",
  "4. Outer Plastic Jacket: physical protection against moisture & bending",
];

function guidedCoaxial(p: MediaRunParams): MediaProgram {
  const activeLayer = p.activeLayerIndex ?? 0;
  const layers = [
    { name: "Center Conductor", material: "Solid Copper Wire", purpose: "Carries high-frequency RF/data signal", radius: 8, color: "#F0D264" },
    { name: "Dielectric Insulator", material: "Foam Polyethylene", purpose: "Maintains uniform impedance & core alignment", radius: 18, color: "#F3F1E7" },
    { name: "Braided Metallic Shield", material: "Tinned Copper Braid", purpose: "Acts as a Faraday cage to ground all external EMI", radius: 28, color: "#9FB3AA" },
    { name: "Outer Jacket", material: "PVC / Polyethylene", purpose: "Abrasion, moisture, and UV environmental shield", radius: 36, color: "#16342A" },
  ];

  const coaxial: MediaCoaxial = {
    layers,
    activeLayerIndex: activeLayer,
  };

  const steps: MediaStep[] = [
    {
      kind: "coaxial",
      coaxial,
      description: "Coaxial Cable Architecture: The cylindrical outer braided shield acts as a continuous Faraday cage surrounding the central core conductor. External noise hits the shield and drains straight to ground before it can penetrate the dielectric insulator.",
      codeLines: [1, 2, 3, 4],
      message: { text: "RG-6 Coaxial · 75 Ohm Impedance · Faraday Shielding", tone: "ok" },
    },
  ];

  return {
    steps,
    title: "Coaxial Cable Architecture & Shielding",
    pseudocode: COAX_CODE,
    stats: [
      { label: "Impedance", value: "50 / 75 Ohm", tone: "signal" },
      { label: "Shielding", value: "Continuous Faraday Cage", tone: "mint" },
      { label: "Use Cases", value: "DOCSIS 3.1 / Cable TV", tone: "signal" },
      { label: "Max Reach", value: "500 meters", tone: "amber" },
    ],
  };
}

// --- Operation: Guided Media — Optical Fiber (TIR) --------------------------

const FIBER_CODE = [
  "Snell's Law: n1 * sin(theta_1) = n2 * sin(theta_2)",
  "Condition 1: Core index n1 > Cladding index n2",
  "Critical Angle theta_c = arcsin(n2 / n1)",
  "If launch angle theta >= theta_c: TOTAL INTERNAL REFLECTION (TIR)",
  "Light bounces 100% loss-free along the core through dielectric reflection",
];

function guidedFiber(p: MediaRunParams): MediaProgram {
  const n1 = p.coreIndex ?? 1.48;
  const n2 = p.claddingIndex ?? 1.46;
  const launchAngle = p.launchAngleDeg ?? 83;
  const mode = p.fiberMode || "smf";

  // Critical angle theta_c = arcsin(n2 / n1)
  const critRad = Math.asin(n2 / n1);
  const critDeg = (critRad * 180) / Math.PI;
  const isTIR = launchAngle >= critDeg;

  // Generate bounce rays
  const rays: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
  const rayColor = isTIR ? "#B9E39A" : "#E39AA6";

  if (isTIR) {
    let currX = 30;
    let currY = 50;
    let dy = -18;
    for (let i = 0; i < 6; i++) {
      const nextX = currX + 75;
      const nextY = currY + dy;
      rays.push({ x1: currX, y1: currY, x2: nextX, y2: nextY, color: rayColor });
      currX = nextX;
      currY = nextY;
      dy = -dy;
    }
  } else {
    // Escapes into cladding
    rays.push({ x1: 30, y1: 50, x2: 90, y2: 25, color: rayColor });
    rays.push({ x1: 90, y1: 25, x2: 160, y2: 5, color: "#E39AA6" }); // lost into cladding
  }

  const rayOptics: MediaRayOptics = {
    coreIndex: n1,
    claddingIndex: n2,
    criticalAngleDeg: Math.round(critDeg * 10) / 10,
    launchAngleDeg: launchAngle,
    isTIR,
    rays,
    mode,
  };

  const steps: MediaStep[] = [
    {
      kind: "rayOptics",
      rayOptics,
      description: isTIR
        ? `Total Internal Reflection (TIR): Since launch angle ($\\theta = ${launchAngle}^\\circ$) is greater than the critical angle ($\\theta_c = \\arcsin(${n2}/${n1}) = ${critDeg.toFixed(1)}^\\circ$), zero light refracts into the cladding. 100% of the optical photon energy reflects back into the core, traveling hundreds of kilometers with negligible attenuation!`
        : `Refraction Loss: Launch angle ($\\theta = ${launchAngle}^\\circ$) is less than critical angle $\\theta_c = ${critDeg.toFixed(1)}^\\circ$. The light ray escapes into the cladding and is absorbed.`,
      codeLines: isTIR ? [1, 2, 3, 4, 5] : [1, 3],
      message: {
        text: isTIR ? `TIR Active (theta=${launchAngle}° >= theta_c=${critDeg.toFixed(1)}°)` : "Light Refracted into Cladding — Signal Lost",
        tone: isTIR ? "ok" : "error",
      },
    },
  ];

  return {
    steps,
    title: `Optical Fiber Optics — Total Internal Reflection (${mode.toUpperCase()})`,
    pseudocode: FIBER_CODE,
    stats: [
      { label: "Core (n1)", value: String(n1), tone: "signal" },
      { label: "Cladding (n2)", value: String(n2), tone: "signal" },
      { label: "Critical Angle", value: `${critDeg.toFixed(1)}°`, tone: "amber" },
      { label: "Status", value: isTIR ? "TIR (100% Reflect)" : "Refraction Loss", tone: isTIR ? "mint" : "coral" },
    ],
  };
}

// --- Operation: Unguided Media — Radio Waves --------------------------------

const RADIO_CODE = [
  "Radio Wave Propagation Modes:",
  "1. Ground Wave (< 2 MHz): Follows Earth's curvature (AM Radio)",
  "2. Sky Wave (2 - 30 MHz): Bounces off Ionosphere layer (Shortwave)",
  "3. Space Wave (> 30 MHz): Line-of-sight & building penetration (Wi-Fi, 5G)",
];

function unguidedRadio(): MediaProgram {
  const antennaWave: MediaAntennaWave = {
    type: "ground",
    frequencyLabel: "3 kHz – 1 GHz",
    rangeLabel: "Omnidirectional / Global",
    reflected: true,
  };

  const steps: MediaStep[] = [
    {
      kind: "antennaWave",
      antennaWave,
      description: "Radio Wave Propagation: Radio waves are omnidirectional electromagnetic signals. Low frequencies (<2 MHz) bend along Earth's curvature (Ground Wave); HF waves (2-30 MHz) reflect off charged ionospheric layers (Sky Wave) enabling intercontinental communication without satellites; VHF/UHF waves penetrate walls for Wi-Fi and Cellular.",
      codeLines: [1, 2, 3, 4],
      message: { text: "Radio Waves · Omnidirectional broadcast & Ionospheric bounce", tone: "ok" },
    },
  ];

  return {
    steps,
    title: "Radio Wave Propagation Modes",
    pseudocode: RADIO_CODE,
    stats: [
      { label: "Frequency", value: "3 kHz – 1 GHz", tone: "signal" },
      { label: "Radiation", value: "Omnidirectional", tone: "mint" },
      { label: "Wall Penetration", value: "High (VHF/UHF)", tone: "mint" },
      { label: "Sky Wave Reach", value: "Thousands of km", tone: "signal" },
    ],
  };
}

// --- Operation: Unguided Media — Microwaves ---------------------------------

const MICRO_CODE = [
  "Microwaves: 1 GHz – 300 GHz (High Frequency, Unidirectional)",
  "Requires strict Line-of-Sight (LOS) alignment between parabolic dishes",
  "Earth curvature limits terrestrial relay towers to ~50 km spacing",
  "Subject to atmospheric attenuation and RAIN FADE",
];

function unguidedMicrowave(p: MediaRunParams): MediaProgram {
  const rain = p.rainIntensity ?? 0.2;
  const rainLossDb = rain * 15;

  const antennaWave: MediaAntennaWave = {
    type: "microwave",
    frequencyLabel: "1 GHz – 300 GHz",
    rangeLabel: "Line-of-Sight (~50 km Relay / 36,000 km Satellite)",
    rainAttenuationDb: Math.round(rainLossDb * 10) / 10,
  };

  const steps: MediaStep[] = [
    {
      kind: "antennaWave",
      antennaWave,
      description: `Terrestrial & Satellite Microwaves: Highly directional focused beams between parabolic dish antennas. Because microwaves do not bend around the Earth's horizon, terrestrial towers require line-of-sight relays every ~50 km. Rain fade currently introduces ${rainLossDb.toFixed(1)} dB of atmospheric attenuation.`,
      codeLines: [1, 2, 3, 4],
      message: { text: `Microwave LOS Link · Rain Attenuation: -${rainLossDb.toFixed(1)} dB`, tone: rain > 0.5 ? "warn" : "ok" },
    },
  ];

  return {
    steps,
    title: "Microwave Line-of-Sight & Satellite Relays",
    pseudocode: MICRO_CODE,
    stats: [
      { label: "Frequency", value: "1 – 300 GHz", tone: "signal" },
      { label: "Antenna", value: "Parabolic Dish", tone: "mint" },
      { label: "Rain Fade", value: `-${rainLossDb.toFixed(1)} dB`, tone: rain > 0.5 ? "coral" : "mint" },
      { label: "Reach", value: "50 km / Satellites", tone: "amber" },
    ],
  };
}

// --- Operation: Unguided Media — Infrared -----------------------------------

const IR_CODE = [
  "Infrared: 300 GHz – 400 THz (Very High Frequency)",
  "Cannot penetrate opaque walls or solid obstacles",
  "High inherent physical security — signal confined to a single room",
  "Zero regulatory licensing required (IrDA, TV Remotes)",
];

function unguidedInfrared(): MediaProgram {
  const antennaWave: MediaAntennaWave = {
    type: "infrared",
    frequencyLabel: "300 GHz – 400 THz",
    rangeLabel: "< 10 meters (Room Confined)",
    absorbed: true,
  };

  const steps: MediaStep[] = [
    {
      kind: "antennaWave",
      antennaWave,
      description: "Infrared Transmission: High-frequency optical wavelength that cannot penetrate opaque walls. This property provides built-in room-level security: no eavesdropper in the next room can intercept the signal, and adjacent rooms never interfere with each other.",
      codeLines: [1, 2, 3, 4],
      message: { text: "Infrared Optical LOS · Contained within room · High Security", tone: "ok" },
    },
  ];

  return {
    steps,
    title: "Infrared Wave Properties & Room Isolation",
    pseudocode: IR_CODE,
    stats: [
      { label: "Frequency", value: "300 GHz – 400 THz", tone: "signal" },
      { label: "Wall Penetration", value: "0% (Blocked)", tone: "amber" },
      { label: "Security", value: "High (Room-isolated)", tone: "mint" },
      { label: "Range", value: "< 10 meters", tone: "signal" },
    ],
  };
}

// --- Operation: Media Comparison Radar --------------------------------------

const RADAR_CODE = [
  "Evaluate 6 Key Physical Media across 5 Core Network Attributes:",
  "1. Bandwidth Capacity: Max supported data rate (bps)",
  "2. Max Unrepeated Distance: Reach before amplification is needed",
  "3. EMI Immunity: Resistance to electromagnetic noise",
  "4. Low Cost & Ease of Installation: Economy factor",
  "5. Physical Security: Difficulty of eavesdropping/tapping",
];

function mediaComparison(): MediaProgram {
  const comparisonRadar: MediaComparisonRadar = {
    media: [
      { name: "Twisted Pair (Cat 6A)", bandwidth: 7, maxDistance: 3, emiImmunity: 5, lowCost: 9, security: 5, color: "#F0D264" },
      { name: "Coaxial Cable (RG-6)", bandwidth: 6, maxDistance: 5, emiImmunity: 7, lowCost: 7, security: 6, color: "#F0A868" },
      { name: "Optical Fiber (SMF)", bandwidth: 10, maxDistance: 10, emiImmunity: 10, lowCost: 3, security: 10, color: "#B9E39A" },
      { name: "Wi-Fi (Radio 6E)", bandwidth: 7, maxDistance: 3, emiImmunity: 4, lowCost: 8, security: 4, color: "#8FCBE0" },
      { name: "Microwave LOS", bandwidth: 8, maxDistance: 7, emiImmunity: 6, lowCost: 5, security: 6, color: "#C9A8F5" },
      { name: "Satellite Link", bandwidth: 7, maxDistance: 9, emiImmunity: 6, lowCost: 2, security: 5, color: "#E39AA6" },
    ],
  };

  const steps: MediaStep[] = [
    {
      kind: "comparisonRadar",
      comparisonRadar,
      description: "Master Media Comparison: Optical fiber dominates bandwidth, distance, and EMI immunity (since photons are immune to electromagnetic noise), but costs more to terminate. Twisted pair is the king of office cost-efficiency. Wireless radio provides unparalleled device mobility.",
      codeLines: [1, 2, 3, 4, 5],
      message: { text: "Physical Media Benchmark: Fiber vs Copper vs Wireless", tone: "ok" },
    },
  ];

  return {
    steps,
    title: "Master Transmission Media Benchmark Matrix",
    pseudocode: RADAR_CODE,
    stats: [
      { label: "Top Bandwidth", value: "Optical Fiber (100 Tbps)", tone: "mint" },
      { label: "Top Distance", value: "Single-Mode Fiber (>100 km)", tone: "mint" },
      { label: "Most Cost-Effective", value: "UTP Cat 6A", tone: "signal" },
      { label: "Most Mobile", value: "Radio / Wi-Fi 6E", tone: "signal" },
    ],
  };
}

// --- Public Dispatcher ------------------------------------------------------

export function runMediaOperation(p: MediaRunParams): MediaProgram {
  switch (p.op) {
    case "signalBasics":
      return signalBasics(p);
    case "guidedTwistedPair":
      return guidedTwistedPair(p);
    case "guidedCoaxial":
      return guidedCoaxial(p);
    case "guidedFiber":
      return guidedFiber(p);
    case "unguidedRadio":
      return unguidedRadio();
    case "unguidedMicrowave":
      return unguidedMicrowave(p);
    case "unguidedInfrared":
      return unguidedInfrared();
    case "mediaComparison":
    default:
      return mediaComparison();
  }
}
