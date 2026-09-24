"use client";

// The physical layer, drawn from the engine's numbers.
//
// Each lesson is a few frames; `phase` says how much has been revealed and
// `focus` which part is being talked about, so the canvas dims everything
// else. Every part is clickable and opens a card in the Inspector with the
// run's own values (mediaFacts).

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { FitStage } from "@/components/visualizer/FitStage";
import { factSelection } from "@/components/visualizer/lesson/FactBody";
import { AXES } from "@/engines/mediaEngine";
import { FIBER_PARTS, WAVE_PARTS, bitFact, mediumFact, wireFact } from "@/engines/mediaFacts";
import { useLessonUi } from "@/lib/lessonUiStore";
import { useMediaStore } from "@/lib/mediaStore";
import { PALETTE } from "@/lib/palette";
import type { MediaStep } from "@/types/visualization";

const W = 680;
const H = 360;

/** Clicks → Inspector. One hook so every view speaks the same way. */
function usePick() {
  const toggleSelect = useLessonUi((s) => s.toggleSelect);
  const selected = useLessonUi((s) => s.selection?.key);
  return { toggleSelect, selected };
}

/** Opacity for a part: full when it is the focus (or nothing is), dim otherwise. */
const dimUnless = (focus: string | undefined, ...ids: string[]) => (!focus || ids.includes(focus) ? 1 : 0.35);

export function MediaCanvas() {
  const step = useMediaStore((s) => s.currentStep());
  if (!step) return null;

  return (
    <FitStage>
      <div className="flex flex-col items-center gap-3" style={{ width: W }}>
        <div
          className="relative flex items-center justify-center rounded-xl border-[1.5px] border-dashed border-outline-variant bg-surface-container-low/70 p-4 backdrop-blur-md"
          style={{ width: W, height: H }}
        >
          {step.kind === "waveform" && <WaveformView step={step} />}
          {step.kind === "twistedPair" && <TwistedPairView step={step} />}
          {step.kind === "coaxial" && <CoaxialView step={step} />}
          {step.kind === "rayOptics" && <FiberView step={step} />}
          {step.kind === "antennaWave" && step.antennaWave?.type === "radio" && <RadioView step={step} />}
          {step.kind === "antennaWave" && step.antennaWave?.type === "microwave" && <MicrowaveView step={step} />}
          {step.kind === "antennaWave" && step.antennaWave?.type === "infrared" && <InfraredView step={step} />}
          {step.kind === "comparisonRadar" && <ComparisonView step={step} />}
        </div>

        <AnimatePresence mode="wait">
          {step.message && (
            <motion.div
              key={step.message.text}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`flex items-center self-center rounded-full border-[1.5px] border-dashed px-4 py-1.5 font-hand text-[15px] font-bold backdrop-blur-sm ${
                step.message.tone === "error"
                  ? "border-coral/70 bg-coral/10 text-coral"
                  : step.message.tone === "ok"
                    ? "border-mint/70 bg-mint/10 text-mint"
                    : step.message.tone === "warn"
                      ? "border-amber/70 bg-amber/10 text-amber"
                      : "border-outline-variant bg-surface-container/80 text-on-surface-variant"
              }`}
            >
              {step.message.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FitStage>
  );
}

/** An SVG group that is a button. */
function Hit({ onClick, label, children, opacity = 1, selected }: { onClick: () => void; label: string; children: ReactNode; opacity?: number; selected?: boolean }) {
  return (
    <motion.g
      role="button"
      tabIndex={0}
      aria-label={label}
      initial={false}
      animate={{ opacity }}
      transition={{ duration: 0.35 }}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className="cursor-pointer outline-none [&:hover]:brightness-125"
      style={selected ? { filter: `drop-shadow(0 0 6px ${PALETTE.note})` } : undefined}
    >
      {children}
    </motion.g>
  );
}

const T = ({ x, y, children, fill = PALETTE.muted, size = 13, anchor = "middle", weight }: { x: number; y: number; children: ReactNode; fill?: string; size?: number; anchor?: "start" | "middle" | "end"; weight?: number }) => (
  <text x={x} y={y} fill={fill} fontSize={size} fontWeight={weight} textAnchor={anchor} fontFamily="var(--font-jetbrains-mono), monospace">
    {children}
  </text>
);

// --- waveform ------------------------------------------------------------------

function wavePath(type: string, bits: string, drawn: number, x0: number, bw: number, hi: number, lo: number): string {
  const mid = (hi + lo) / 2;
  if (type === "nrz" || type === "manchester") {
    if (drawn === 0) return "";
    let d = "";
    for (let i = 0; i < drawn; i++) {
      const x = x0 + i * bw;
      const b = bits[i];
      if (type === "nrz") {
        const y = b === "1" ? hi : lo;
        d += `${i === 0 ? "M" : "L"} ${x} ${y} L ${x + bw} ${y} `;
      } else {
        const a = b === "1" ? lo : hi;
        const z = b === "1" ? hi : lo;
        d += `${i === 0 ? "M" : "L"} ${x} ${a} L ${x + bw / 2} ${a} L ${x + bw / 2} ${z} L ${x + bw} ${z} `;
      }
    }
    return d;
  }
  // Analog: a carrier, modulated per bit once the bits are "drawn".
  const amp = (hi - lo) / 2;
  let d = `M ${x0} ${mid}`;
  const total = bits.length * bw;
  let phase = 0;
  for (let x = 0; x <= total; x += 2) {
    const i = Math.min(bits.length - 1, Math.floor(x / bw));
    const one = drawn > 0 && bits[i] === "1";
    const a = type === "am" && drawn > 0 ? (one ? 1 : 0.35) * amp : type === "qam" && drawn > 0 ? (one ? 1 : 0.55) * amp : 0.85 * amp;
    const f = type === "fm" && drawn > 0 ? (one ? 0.26 : 0.11) : 0.16;
    const shift = type === "qam" && drawn > 0 && i % 2 === 1 ? Math.PI / 2 : 0;
    phase += f * 2;
    d += ` L ${x0 + x} ${mid - a * Math.sin(phase + shift)}`;
  }
  return d;
}

function WaveformView({ step }: { step: MediaStep }) {
  const { toggleSelect, selected } = usePick();
  const wf = step.waveform!;
  const { bits, drawn, signalType: type } = wf;
  const digital = type === "nrz" || type === "manchester";
  const x0 = 40;
  const bw = 72;
  const hi = 70;
  const lo = 170;
  const d = wavePath(type, bits, drawn, x0, bw, hi, lo);
  // Where the level changes, for the "clock" frame.
  const edges: number[] = [];
  if (digital) {
    for (let i = 0; i < bits.length; i++) {
      if (type === "manchester") edges.push(x0 + i * bw + bw / 2);
      if (i > 0 && (type === "nrz" ? bits[i] !== bits[i - 1] : bits[i] === bits[i - 1])) edges.push(x0 + i * bw);
    }
  }
  const clock = step.focus === "clock";

  return (
    <svg width={660} height={250} className="overflow-visible">
      {/* bit cells */}
      {bits.split("").map((b, i) => {
        const key = `bit-${i}`;
        return (
          <Hit
            key={i}
            label={`Bit ${i + 1}: ${b}`}
            selected={selected === key}
            opacity={step.focus === "bit-0" && i > 0 ? 0.45 : 1}
            onClick={() => toggleSelect(factSelection(key, `Bit ${i + 1}`, `A ${b}`, PALETTE.data, bitFact(bits, i, type)))}
          >
            <rect x={x0 + i * bw + 4} y={10} width={bw - 8} height={30} rx={5} fill={i < drawn ? `${PALETTE.data}26` : "transparent"} stroke={PALETTE.data} strokeOpacity={0.6} strokeDasharray="4 3" />
            <T x={x0 + i * bw + bw / 2} y={31} fill={PALETTE.data} size={18} weight={700}>
              {b}
            </T>
            {/* the whole column is clickable */}
            <rect x={x0 + i * bw} y={46} width={bw} height={140} fill="transparent" />
          </Hit>
        );
      })}
      {/* levels and bit boundaries */}
      {digital ? (
        <>
          <line x1={x0} y1={hi} x2={x0 + bits.length * bw} y2={hi} stroke={PALETTE.wire} strokeDasharray="3 5" opacity={0.5} />
          <line x1={x0} y1={lo} x2={x0 + bits.length * bw} y2={lo} stroke={PALETTE.wire} strokeDasharray="3 5" opacity={0.5} />
          <T x={x0 - 8} y={hi + 4} anchor="end" size={12}>+V</T>
          <T x={x0 - 8} y={lo + 4} anchor="end" size={12}>−V</T>
        </>
      ) : (
        <line x1={x0} y1={(hi + lo) / 2} x2={x0 + bits.length * bw} y2={(hi + lo) / 2} stroke={PALETTE.wire} strokeDasharray="3 5" opacity={0.5} />
      )}
      {Array.from({ length: bits.length + 1 }).map((_, i) => (
        <line key={i} x1={x0 + i * bw} y1={50} x2={x0 + i * bw} y2={186} stroke={PALETTE.wire} strokeDasharray="2 6" opacity={0.35} />
      ))}
      {/* the signal */}
      <motion.path
        key={`${type}-${drawn}`}
        d={d}
        fill="none"
        stroke={PALETTE.data}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: "easeInOut" }}
      />
      {clock &&
        edges.map((x, i) => (
          <motion.circle key={i} cx={x} cy={(hi + lo) / 2} r={7} fill="none" stroke={PALETTE.ok} strokeWidth={2.5} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 }} />
        ))}
      <T x={330} y={228} size={14} fill={PALETTE.chalk}>
        {digital ? (clock ? `${edges.length} edges the receiver can sync on` : `encoding: ${type === "nrz" ? "NRZ-L" : "Manchester"}`) : drawn ? `${type.toUpperCase()}-modulated carrier` : "plain carrier — no information yet"}
      </T>
    </svg>
  );
}

// --- twisted pair -----------------------------------------------------------------

function TwistedPairView({ step }: { step: MediaStep }) {
  const { toggleSelect, selected } = usePick();
  const { twistRate, noiseLevel } = step.twistedPair!;
  const x0 = 30;
  const x1 = 470;
  const mid = 150;
  const amp = 16;
  const crossings = Math.max(2, Math.round(twistRate * 1.2));
  const path = (sign: 1 | -1) => {
    let d = `M ${x0} ${mid + sign * amp * Math.sin(0)}`;
    for (let x = 0; x <= x1 - x0; x += 3) d += ` L ${x0 + x} ${mid + sign * amp * Math.sin((x / (x1 - x0)) * crossings * Math.PI)}`;
    return d;
  };
  const noise = step.phase >= 1;
  const rx = step.phase >= 2;
  const N = noiseLevel.toFixed(1);
  const pick = (id: "A" | "B" | "noise" | "receiver", title: string, color: string) =>
    toggleSelect(factSelection(`tp-${id}`, "Twisted pair", title, color, wireFact(id, noiseLevel, twistRate)));

  return (
    <svg width={660} height={300} className="overflow-visible">
      <T x={x0} y={70} anchor="start" size={14} fill={PALETTE.ok}>A: +V{noise ? ` + ${N}N` : ""}</T>
      <T x={x0} y={250} anchor="start" size={14} fill={PALETTE.control}>B: −V{noise ? ` + ${N}N` : ""}</T>
      {/* noise */}
      <Hit label="Noise" opacity={noise ? dimUnless(step.focus, "noise", "receiver", "twists") : 0} selected={selected === "tp-noise"} onClick={() => pick("noise", `${N}N of interference`, PALETTE.fail)}>
        {[120, 220, 320].map((x, i) => (
          <motion.path
            key={x}
            d={`M ${x} 30 l -10 22 l 14 0 l -12 26`}
            fill="none"
            stroke={PALETTE.fail}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={noise ? { y: [0, 6, 0] } : {}}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
        <rect x={100} y={20} width={260} height={70} fill="transparent" />
        <T x={235} y={20} fill={PALETTE.fail} size={13}>noise +{N}N on both wires</T>
      </Hit>
      {/* the two wires */}
      <Hit label="Wire A" opacity={dimUnless(step.focus, "wires", "noise", "twists", "receiver")} selected={selected === "tp-A"} onClick={() => pick("A", "Wire A (+V)", PALETTE.ok)}>
        <path d={path(1)} fill="none" stroke="transparent" strokeWidth={16} />
        <path d={path(1)} fill="none" stroke={PALETTE.ok} strokeWidth={4} strokeLinecap="round" />
      </Hit>
      <Hit label="Wire B" opacity={dimUnless(step.focus, "wires", "noise", "twists", "receiver")} selected={selected === "tp-B"} onClick={() => pick("B", "Wire B (−V)", PALETTE.control)}>
        <path d={path(-1)} fill="none" stroke="transparent" strokeWidth={16} />
        <path d={path(-1)} fill="none" stroke={PALETTE.control} strokeWidth={4} strokeLinecap="round" />
      </Hit>
      {step.focus === "twists" && (
        <T x={250} y={200} size={13} fill={PALETTE.note}>
          {twistRate} twists / metre — each wire is on top half the time
        </T>
      )}
      {/* receiver */}
      <Hit label="Receiver" opacity={rx ? 1 : 0.3} selected={selected === "tp-receiver"} onClick={() => pick("receiver", "Differential receiver", PALETTE.note)}>
        <rect x={490} y={100} width={150} height={100} rx={10} fill={`${PALETTE.note}14`} stroke={PALETTE.note} strokeWidth={2} strokeDasharray="6 4" />
        <T x={565} y={128} fill={PALETTE.note} size={14} weight={700}>A − B</T>
        {rx ? (
          <>
            <T x={565} y={152} size={12}>noise cancels</T>
            <T x={565} y={182} fill={PALETTE.ok} size={22} weight={700}>= 2V</T>
          </>
        ) : (
          <T x={565} y={165} size={12}>waiting</T>
        )}
      </Hit>
    </svg>
  );
}

// --- coaxial -------------------------------------------------------------------------

function CoaxialView({ step }: { step: MediaStep }) {
  const { toggleSelect, selected } = usePick();
  const layers = step.coaxial!.layers;
  const pick = (i: number) => {
    const l = layers[i];
    toggleSelect(
      factSelection(`coax-${l.id}`, `Layer ${i + 1} of 4`, l.name, l.color === "#2E604C" ? PALETTE.muted : l.color, {
        lead: l.purpose,
        rows: [["Material", l.material], ["Position", i === 0 ? "centre" : `ring ${i + 1} from the centre`]],
        remember: "Core carries, dielectric centres, shield protects, jacket covers.",
      }),
    );
  };
  const noise = step.focus === "noise";
  const cx = 150;
  const cy = 150;
  const k = 3.4;

  return (
    <div className="grid w-full grid-cols-[300px_1fr] items-center gap-6">
      <svg width={300} height={300} className="overflow-visible">
        {[...layers].reverse().map((l) => {
          const i = layers.indexOf(l);
          const on = dimUnless(step.focus === "noise" ? "shield" : step.focus, l.id);
          return (
            <Hit key={l.id} label={l.name} opacity={on} selected={selected === `coax-${l.id}`} onClick={() => pick(i)}>
              <circle cx={cx} cy={cy} r={l.radius * k} fill={l.color} stroke={PALETTE.chalk} strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray={l.id === "shield" ? "5 3" : undefined} />
            </Hit>
          );
        })}
        {noise &&
          [0, 1, 2, 3, 4].map((i) => {
            const a = -Math.PI / 2 + (i - 2) * 0.5;
            const r0 = 150;
            const r1 = layers[2].radius * k + 2;
            return (
              <motion.line
                key={i}
                x1={cx + Math.cos(a) * r0}
                y1={cy + Math.sin(a) * r0}
                stroke={PALETTE.fail}
                strokeWidth={3}
                strokeLinecap="round"
                initial={{ x2: cx + Math.cos(a) * r0, y2: cy + Math.sin(a) * r0 }}
                animate={{ x2: cx + Math.cos(a) * r1, y2: cy + Math.sin(a) * r1 }}
                transition={{ duration: 0.6, delay: i * 0.08, repeat: Infinity, repeatDelay: 0.6 }}
              />
            );
          })}
      </svg>
      <div className="flex flex-col gap-2">
        {layers.map((l, i) => (
          <motion.button
            type="button"
            key={l.id}
            onClick={() => pick(i)}
            initial={false}
            animate={{ opacity: dimUnless(step.focus === "noise" ? "shield" : step.focus, l.id) }}
            className={`flex flex-col rounded-md border bg-surface-container-high/40 px-3 py-2 text-left transition-colors hover:bg-surface-container-high ${
              selected === `coax-${l.id}` ? "border-note" : "border-outline-variant/60"
            }`}
          >
            <span className="font-hand text-[17px] font-bold" style={{ color: l.id === "jacket" ? PALETTE.muted : l.color }}>
              {i + 1}. {l.name}
            </span>
            <span className="font-sans text-[13px] text-on-surface-variant">{l.purpose}</span>
          </motion.button>
        ))}
        {noise && <span className="font-hand text-[15px] text-coral">Noise lands on the shield and drains to ground.</span>}
      </div>
    </div>
  );
}

// --- fibre ------------------------------------------------------------------------------

function FiberView({ step }: { step: MediaStep }) {
  const { toggleSelect, selected } = usePick();
  const o = step.rayOptics!;
  const top = 70;
  const bot = 210;
  const len = 640;
  const pick = (id: string, color: string, rows?: [string, string][]) =>
    toggleSelect(factSelection(`fib-${id}`, "Optical fibre", FIBER_PARTS[id].name, color, { lead: FIBER_PARTS[id].lead, rows, remember: FIBER_PARTS[id].remember }));
  // The drawing exaggerates the angle so the zig-zag is visible; the numbers stay true.
  const grazing = Math.max(8, Math.min(70, (90 - o.launchAngleDeg) * 2.2));
  const slope = Math.tan((grazing * Math.PI) / 180);
  const pts: [number, number][] = [[10, (top + bot) / 2]];
  let x = 10;
  let y = (top + bot) / 2;
  let dir = -1;
  let escaped: [number, number] | null = null;
  while (x < len) {
    const target = dir < 0 ? top : bot;
    const nx = x + Math.abs(target - y) / slope;
    if (nx > len) {
      pts.push([len, y + (dir * (len - x) * slope)]);
      break;
    }
    pts.push([nx, target]);
    if (!o.isTIR) {
      // Refracts out: continue into the cladding at the refracted angle, then stop.
      escaped = [nx + 60, target + dir * 50];
      break;
    }
    x = nx;
    y = target;
    dir = -dir;
  }
  const d = pts.map((p, i) => `${i ? "L" : "M"} ${p[0]} ${p[1]}`).join(" ");
  const showRay = step.phase >= 2;

  return (
    <svg width={660} height={290} className="overflow-visible">
      <Hit label="Cladding" opacity={dimUnless(step.focus, "glass", "mode")} selected={selected === "fib-cladding"} onClick={() => pick("cladding", PALETTE.muted, [["n2", String(o.claddingIndex)]])}>
        <rect x={0} y={top - 50} width={len} height={50} fill="#2E604C" />
        <rect x={0} y={bot} width={len} height={50} fill="#2E604C" />
        <T x={12} y={top - 18} anchor="start" size={13}>cladding · n2 = {o.claddingIndex}</T>
      </Hit>
      <Hit label="Core" opacity={dimUnless(step.focus, "glass", "mode", "ray")} selected={selected === "fib-core"} onClick={() => pick("core", PALETTE.note, [["n1", String(o.coreIndex)], ["Mode", o.mode === "smf" ? "single-mode (~9 µm)" : "multi-mode (~50 µm)"]])}>
        <rect x={0} y={top} width={len} height={bot - top} fill={`${PALETTE.note}1c`} />
        <line x1={0} y1={top} x2={len} y2={top} stroke={PALETTE.wire} strokeDasharray="6 4" strokeWidth={1.5} />
        <line x1={0} y1={bot} x2={len} y2={bot} stroke={PALETTE.wire} strokeDasharray="6 4" strokeWidth={1.5} />
        <T x={12} y={bot - 12} anchor="start" size={13} fill={PALETTE.note}>core · n1 = {o.coreIndex}</T>
      </Hit>
      {step.phase >= 1 && pts[1] && (
        <Hit label="Normal and critical angle" opacity={dimUnless(step.focus, "critical", "ray")} selected={selected === "fib-normal"} onClick={() => pick("normal", PALETTE.control, [["θc", `${o.criticalAngleDeg}°`], ["θ (this ray)", `${o.launchAngleDeg}°`]])}>
          <line x1={pts[1][0]} y1={top - 40} x2={pts[1][0]} y2={top + 60} stroke={PALETTE.control} strokeDasharray="4 4" strokeWidth={2} />
          <T x={pts[1][0] + 8} y={top + 78} anchor="start" size={13} fill={PALETTE.control}>normal · θc = {o.criticalAngleDeg}°</T>
        </Hit>
      )}
      {showRay && (
        <Hit label="Light ray" opacity={dimUnless(step.focus, "ray", "mode")} selected={selected === "fib-ray"} onClick={() => pick("ray", o.isTIR ? PALETTE.ok : PALETTE.fail, [["θ", `${o.launchAngleDeg}°`], ["θc", `${o.criticalAngleDeg}°`], ["Result", o.isTIR ? "total internal reflection" : "refracts out"]])}>
          <path d={d} fill="none" stroke="transparent" strokeWidth={14} />
          <motion.path d={d} fill="none" stroke={o.isTIR ? PALETTE.ok : PALETTE.data} strokeWidth={3.5} strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "linear" }} />
          {escaped && (
            <motion.line x1={pts.at(-1)![0]} y1={pts.at(-1)![1]} x2={escaped[0]} y2={escaped[1]} stroke={PALETTE.fail} strokeWidth={3.5} strokeDasharray="6 4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} />
          )}
        </Hit>
      )}
      <T x={330} y={284} size={14} fill={PALETTE.chalk}>
        {step.phase < 2 ? `θc = arcsin(${o.claddingIndex} / ${o.coreIndex}) = ${o.criticalAngleDeg}°` : `θ = ${o.launchAngleDeg}° ${o.isTIR ? ">" : "<"} θc = ${o.criticalAngleDeg}° → ${o.isTIR ? "trapped" : "escapes"}`}
      </T>
    </svg>
  );
}

// --- radio ------------------------------------------------------------------------------

function wavePick(toggleSelect: ReturnType<typeof usePick>["toggleSelect"], id: string, color: string) {
  const f = WAVE_PARTS[id];
  toggleSelect(factSelection(`wave-${id}`, "Unguided media", f.name, color, { lead: f.lead, rows: f.rows, remember: f.remember }));
}

function RadioView({ step }: { step: MediaStep }) {
  const { toggleSelect, selected } = usePick();
  const earth = "M 0 270 Q 330 200 660 270";
  const paths: { id: string; d: string; color: string; label: string; lx: number; ly: number }[] = [
    { id: "ground", d: "M 60 238 Q 330 196 600 238", color: PALETTE.data, label: "ground wave < 2 MHz", lx: 330, ly: 236 },
    { id: "sky", d: "M 60 230 L 330 52 L 600 230", color: PALETTE.protocol, label: "sky wave 2–30 MHz", lx: 420, ly: 120 },
    { id: "space", d: "M 60 226 L 250 150", color: PALETTE.note, label: "space wave > 30 MHz", lx: 170, ly: 176 },
  ];
  return (
    <svg width={660} height={290} className="overflow-visible">
      <Hit label="Ionosphere" opacity={dimUnless(step.focus, "sky")} selected={selected === "wave-ionosphere"} onClick={() => wavePick(toggleSelect, "ionosphere", PALETTE.protocol)}>
        <rect x={0} y={20} width={660} height={32} fill={`${PALETTE.protocol}22`} />
        <T x={330} y={40} size={13} fill={PALETTE.protocol}>ionosphere</T>
      </Hit>
      <path d={earth} fill="none" stroke={PALETTE.wire} strokeWidth={3} />
      <T x={600} y={284} size={12}>the Earth</T>
      {/* antennas */}
      <line x1={60} y1={240} x2={60} y2={200} stroke={PALETTE.chalk} strokeWidth={3} />
      <line x1={600} y1={240} x2={600} y2={200} stroke={PALETTE.chalk} strokeWidth={3} />
      <rect x={250} y={130} width={50} height={60} fill="none" stroke={PALETTE.chalk} strokeDasharray="4 3" />
      <T x={275} y={126} size={12}>building</T>
      {paths.map((p) => {
        const shown = step.phase >= ["ground", "sky", "space"].indexOf(p.id);
        return (
          <Hit key={p.id} label={p.label} opacity={shown ? dimUnless(step.focus, p.id) : 0.08} selected={selected === `wave-${p.id}`} onClick={() => wavePick(toggleSelect, p.id, p.color)}>
            <path d={p.d} fill="none" stroke="transparent" strokeWidth={16} />
            <motion.path d={p.d} fill="none" stroke={p.color} strokeWidth={3.5} strokeDasharray="10 6" animate={{ strokeDashoffset: [0, -32] }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
            <T x={p.lx} y={p.ly} size={13} fill={p.color}>{p.label}</T>
          </Hit>
        );
      })}
    </svg>
  );
}

// --- microwave ---------------------------------------------------------------------------

function MicrowaveView({ step }: { step: MediaStep }) {
  const { toggleSelect, selected } = usePick();
  const db = step.antennaWave?.rainAttenuationDb ?? 0;
  const relay = step.phase >= 1;
  const rain = step.phase >= 2;
  const towers = relay ? [80, 330, 580] : [80, 580];
  const top = (x: number) => 140 + Math.pow((x - 330) / 330, 2) * 60;
  return (
    <svg width={660} height={290} className="overflow-visible">
      <path d="M 0 270 Q 330 150 660 270" fill="none" stroke={PALETTE.wire} strokeWidth={3} />
      {relay ? null : <T x={330} y={150} size={13} fill={PALETTE.fail}>the Earth bulges between them</T>}
      {towers.map((x, i) => {
        const t = top(x);
        const isRelay = relay && i === 1;
        return (
          <Hit key={x} label={isRelay ? "Relay tower" : "Dish"} selected={selected === `wave-${isRelay ? "relay" : "dish"}`} opacity={dimUnless(step.focus, isRelay ? "relay" : "beam", "rain")} onClick={() => wavePick(toggleSelect, isRelay ? "relay" : "dish", PALETTE.data)}>
            <line x1={x} y1={t + 80} x2={x} y2={t - 60} stroke={PALETTE.chalk} strokeWidth={3} />
            <path d={`M ${x - 14} ${t - 74} Q ${x} ${t - 50} ${x + 14} ${t - 74}`} fill="none" stroke={PALETTE.data} strokeWidth={3} />
            <T x={x} y={t + 100} size={12}>{isRelay ? "relay" : "dish"}</T>
          </Hit>
        );
      })}
      {towers.slice(0, -1).map((x, i) => {
        const x2 = towers[i + 1];
        return (
          <Hit key={x} label="Beam" opacity={dimUnless(step.focus, "beam", "relay", "rain")} selected={selected === "wave-dish"} onClick={() => wavePick(toggleSelect, "dish", PALETTE.data)}>
            <motion.line x1={x} y1={top(x) - 66} x2={x2} y2={top(x2) - 66} stroke={PALETTE.data} strokeWidth={4} strokeDasharray="12 6" animate={{ strokeDashoffset: [0, -36] }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} opacity={rain ? 0.55 : 1} />
          </Hit>
        );
      })}
      {rain && (
        <Hit label="Rain" selected={selected === "wave-rain"} onClick={() => wavePick(toggleSelect, "rain", PALETTE.note)}>
          {Array.from({ length: 26 }).map((_, i) => (
            <motion.line key={i} x1={150 + (i % 13) * 28} x2={144 + (i % 13) * 28} stroke={PALETTE.note} strokeWidth={2} initial={{ y1: 20 + Math.floor(i / 13) * 30, y2: 34 + Math.floor(i / 13) * 30 }} animate={{ y1: [20, 110], y2: [34, 124] }} transition={{ duration: 0.9, repeat: Infinity, delay: (i % 7) * 0.12, ease: "linear" }} />
          ))}
          <rect x={140} y={10} width={380} height={120} fill="transparent" />
          <T x={330} y={20} size={14} fill={PALETTE.note} weight={700}>rain fade −{db} dB</T>
        </Hit>
      )}
    </svg>
  );
}

// --- infrared ------------------------------------------------------------------------------

function InfraredView({ step }: { step: MediaStep }) {
  const { toggleSelect, selected } = usePick();
  const blocked = step.phase >= 1;
  return (
    <svg width={660} height={290} className="overflow-visible">
      <T x={170} y={30} size={14} fill={PALETTE.chalk}>Room 1</T>
      <T x={500} y={30} size={14} fill={PALETTE.chalk}>Room 2</T>
      <Hit label="Remote" opacity={dimUnless(step.focus, "beam", "rooms")} selected={selected === "wave-remote"} onClick={() => wavePick(toggleSelect, "remote", PALETTE.fail)}>
        <rect x={40} y={140} width={34} height={70} rx={8} fill="#2E604C" stroke={PALETTE.chalk} strokeWidth={2} />
        <circle cx={57} cy={150} r={5} fill={PALETTE.fail} />
        <T x={57} y={232} size={12}>remote</T>
      </Hit>
      <Hit label="TV in room 1" opacity={dimUnless(step.focus, "beam", "rooms")} selected={selected === "wave-tv"} onClick={() => wavePick(toggleSelect, "tv", PALETTE.ok)}>
        <rect x={230} y={90} width={70} height={50} rx={4} fill={`${PALETTE.ok}33`} stroke={PALETTE.ok} strokeWidth={2} />
        <T x={265} y={160} size={12} fill={PALETTE.ok}>TV · on</T>
      </Hit>
      <motion.line x1={64} y1={148} x2={228} y2={118} stroke={PALETTE.fail} strokeWidth={3} strokeDasharray="8 6" animate={{ strokeDashoffset: [0, -28] }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }} />
      {blocked && (
        <motion.line x1={64} y1={152} x2={352} y2={180} stroke={PALETTE.fail} strokeWidth={3} strokeDasharray="8 6" animate={{ strokeDashoffset: [0, -28] }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }} />
      )}
      <Hit label="Wall" opacity={dimUnless(step.focus, "wall", "rooms")} selected={selected === "wave-wall"} onClick={() => wavePick(toggleSelect, "wall", PALETTE.muted)}>
        <rect x={355} y={40} width={22} height={230} fill="#9FB3AA" opacity={0.8} />
        <T x={366} y={284} size={12}>wall</T>
        {blocked && <T x={330} y={200} size={16} fill={PALETTE.fail} weight={700}>✕</T>}
      </Hit>
      <Hit label="TV in room 2" opacity={blocked ? 1 : 0.4} selected={selected === "wave-tv"} onClick={() => wavePick(toggleSelect, "tv", PALETTE.muted)}>
        <rect x={470} y={90} width={70} height={50} rx={4} fill="transparent" stroke={PALETTE.muted} strokeWidth={2} />
        <T x={505} y={160} size={12}>TV · unaffected</T>
      </Hit>
    </svg>
  );
}

// --- comparison ------------------------------------------------------------------------------

function ComparisonView({ step }: { step: MediaStep }) {
  const { toggleSelect, selected } = usePick();
  const { media, axis } = step.comparisonRadar!;
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="grid grid-cols-[150px_repeat(5,1fr)] gap-1.5 font-mono text-[12px]">
        <span />
        {AXES.map((a) => (
          <span key={a.id} className={`rounded px-1 py-1 text-center ${axis === a.id ? "bg-primary/20 font-bold text-primary" : "text-on-surface-variant"}`}>
            {a.name}
          </span>
        ))}
        {media.map((m) => {
          const winner = axis && Math.max(...media.map((x) => x[axis])) === m[axis];
          return (
            <div key={m.name} className="contents">
              <button
                type="button"
                onClick={() => toggleSelect(factSelection(`medium-${m.name}`, "Medium", m.name, m.color, mediumFact(m)))}
                className={`truncate rounded border px-2 py-1 text-left font-hand text-[15px] font-bold hover:bg-surface-container-high ${selected === `medium-${m.name}` ? "border-note" : "border-transparent"}`}
                style={{ color: m.color }}
              >
                {m.name}
              </button>
              {AXES.map((a) => (
                <motion.div key={a.id} initial={false} animate={{ opacity: !axis || axis === a.id ? 1 : 0.3 }} className="flex items-center">
                  <div className="h-5 w-full overflow-hidden rounded-sm bg-black/25">
                    <motion.div initial={false} animate={{ width: `${m[a.id] * 10}%` }} className="h-full" style={{ background: m.color, boxShadow: winner && axis === a.id ? `0 0 10px ${m.color}` : undefined }} />
                  </div>
                  <span className="ml-1 w-5 text-right text-on-surface-variant">{m[a.id]}</span>
                </motion.div>
              ))}
            </div>
          );
        })}
      </div>
      <p className="text-center font-hand text-[15px] text-on-surface-variant">Scores 1–10 · 10 is best · click a medium for its profile</p>
    </div>
  );
}
