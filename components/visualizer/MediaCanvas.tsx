"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FitStage } from "@/components/visualizer/FitStage";
import { PALETTE } from "@/lib/palette";
import { useMediaStore } from "@/lib/mediaStore";

const W = 640;
const H = 360;

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
          {step.kind === "waveform" && step.waveform && <WaveformView data={step.waveform} />}
          {step.kind === "twistedPair" && step.twistedPair && <TwistedPairView data={step.twistedPair} />}
          {step.kind === "coaxial" && step.coaxial && <CoaxialView data={step.coaxial} />}
          {step.kind === "rayOptics" && step.rayOptics && <RayOpticsView data={step.rayOptics} />}
          {step.kind === "antennaWave" && step.antennaWave && <AntennaWaveView data={step.antennaWave} />}
          {step.kind === "comparisonRadar" && step.comparisonRadar && (
            <ComparisonRadarView data={step.comparisonRadar} />
          )}
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

function WaveformView({ data }: { data: NonNullable<import("@/types/visualization").MediaStep["waveform"]> }) {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="font-label-caps text-[10px] uppercase text-on-surface-variant/70">Bits Transmitted:</span>
        <div className="flex gap-2">
          {data.bits.split("").map((b, i) => (
            <span key={i} className="flex h-6 w-6 items-center justify-center rounded border border-primary/40 font-mono text-sm font-bold text-primary">
              {b}
            </span>
          ))}
        </div>
      </div>

      <svg width={480} height={120} className="overflow-visible">
        {/* Baseline / Clock ticks */}
        <line x1={20} y1={50} x2={420} y2={50} stroke={PALETTE.wire} strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={i} x1={20 + i * 50} y1={10} x2={20 + i * 50} y2={90} stroke={PALETTE.wire} strokeWidth={1} strokeDasharray="2 4" opacity={0.3} />
        ))}
        {/* Waveform */}
        <motion.path
          d={data.waveSvgPath}
          fill="none"
          stroke={PALETTE.data}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      </svg>
      <span className="font-hand text-sm text-on-surface-variant/80">
        Encoding: <strong className="text-primary">{data.signalType.toUpperCase()}</strong>
      </span>
    </div>
  );
}

function TwistedPairView({ data }: { data: NonNullable<import("@/types/visualization").MediaStep["twistedPair"]> }) {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 font-mono text-xs text-mint">
          <span className="h-2 w-2 rounded-full bg-mint" /> Wire A: +V
        </span>
        <span className="flex items-center gap-1.5 font-mono text-xs text-amber">
          <span className="h-2 w-2 rounded-full bg-amber" /> Wire B: -V
        </span>
        <span className="flex items-center gap-1.5 font-mono text-xs text-coral">
          <span className="h-2 w-2 rounded-full bg-coral" /> Noise: +{(data.noiseLevel).toFixed(1)}N
        </span>
      </div>

      <svg width={520} height={100} className="overflow-visible">
        <path d={data.wireAPath} fill="none" stroke={PALETTE.ok} strokeWidth={3} strokeLinecap="round" />
        <path d={data.wireBPath} fill="none" stroke={PALETTE.control} strokeWidth={3} strokeLinecap="round" />
      </svg>

      <div className="rounded-md border border-mint/40 bg-mint/10 px-4 py-1.5 font-mono text-xs text-mint">
        Receiver Math: {data.diffOutput}
      </div>
    </div>
  );
}

function CoaxialView({ data }: { data: NonNullable<import("@/types/visualization").MediaStep["coaxial"]> }) {
  return (
    <div className="grid w-full grid-cols-2 items-center gap-6 px-4">
      <div className="flex items-center justify-center">
        <svg width={200} height={200} viewBox="0 0 100 100">
          {data.layers.slice().reverse().map((l, i) => (
            <circle
              key={i}
              cx={50}
              cy={50}
              r={l.radius}
              fill={l.color}
              stroke={PALETTE.wire}
              strokeWidth={1.5}
              opacity={0.85}
            />
          ))}
        </svg>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-hand text-sm font-bold text-primary">Concentric Coaxial Layers</span>
        {data.layers.map((l, i) => (
          <div key={i} className="flex flex-col rounded border border-outline-variant/60 bg-surface-container-high/40 p-1.5">
            <span className="font-mono text-xs font-bold text-on-surface" style={{ color: l.color }}>
              {i + 1}. {l.name}
            </span>
            <span className="font-body-sm text-[11px] text-on-surface-variant/80">{l.purpose}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RayOpticsView({ data }: { data: NonNullable<import("@/types/visualization").MediaStep["rayOptics"]> }) {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex items-center gap-6 font-mono text-xs">
        <span className="text-on-surface-variant">Core $n_1 = {data.coreIndex}$</span>
        <span className="text-on-surface-variant">Cladding $n_2 = {data.claddingIndex}$</span>
        <span className="text-amber">Critical $\theta_c = {data.criticalAngleDeg}^\circ$</span>
        <span className={data.isTIR ? "text-mint font-bold" : "text-coral font-bold"}>
          Launch $\theta = {data.launchAngleDeg}^\circ$
        </span>
      </div>

      <svg width={520} height={140} className="overflow-visible rounded border border-outline-variant/60 bg-surface-container-high/30">
        {/* Cladding top & bottom */}
        <rect x={0} y={0} width={520} height={25} fill="#16342A" opacity={0.6} />
        <rect x={0} y={115} width={520} height={25} fill="#16342A" opacity={0.6} />
        <line x1={0} y1={25} x2={520} y2={25} stroke={PALETTE.wire} strokeWidth={1.5} strokeDasharray="4 4" />
        <line x1={0} y1={115} x2={520} y2={115} stroke={PALETTE.wire} strokeWidth={1.5} strokeDasharray="4 4" />

        {/* Center Glass Core */}
        <rect x={0} y={25} width={520} height={90} fill="#2C5A47" opacity={0.3} />
        <text x={10} y={40} fill={PALETTE.chalk} fontSize={10} fontFamily="monospace" opacity={0.6}>
          Glass Core (n1 = {data.coreIndex})
        </text>
        <text x={10} y={18} fill={PALETTE.chalk} fontSize={10} fontFamily="monospace" opacity={0.6}>
          Cladding (n2 = {data.claddingIndex})
        </text>

        {/* Light rays */}
        {data.rays.map((r, i) => (
          <line
            key={i}
            x1={r.x1}
            y1={r.y1}
            x2={r.x2}
            y2={r.y2}
            stroke={r.color}
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}
      </svg>

      <span className="font-hand text-xs text-on-surface-variant">
        {data.isTIR ? "✅ Total Internal Reflection Active — 100% Optical Light Trapped in Core" : "❌ Refraction Loss — Ray Escaped into Cladding"}
      </span>
    </div>
  );
}

function AntennaWaveView({ data }: { data: NonNullable<import("@/types/visualization").MediaStep["antennaWave"]> }) {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center gap-1">
          <span className="font-label-caps text-[10px] uppercase text-on-surface-variant/70">Frequency Range</span>
          <span className="font-mono text-sm font-bold text-primary">{data.frequencyLabel}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="font-label-caps text-[10px] uppercase text-on-surface-variant/70">Effective Reach</span>
          <span className="font-mono text-sm font-bold text-mint">{data.rangeLabel}</span>
        </div>
      </div>

      <svg width={480} height={120} className="overflow-visible">
        {/* Ground */}
        <line x1={20} y1={100} x2={460} y2={100} stroke={PALETTE.wire} strokeWidth={2} />
        {/* Antennas */}
        <circle cx={60} cy={60} r={8} fill={PALETTE.data} />
        <line x1={60} y1={60} x2={60} y2={100} stroke={PALETTE.data} strokeWidth={2} />

        <circle cx={420} cy={60} r={8} fill={PALETTE.ok} />
        <line x1={420} y1={60} x2={420} y2={100} stroke={PALETTE.ok} strokeWidth={2} />

        {/* Emitted arc waves */}
        {[25, 55, 85, 115, 145].map((r, i) => (
          <path
            key={i}
            d={`M ${60 + r * 0.7} ${60 - r * 0.6} A ${r} ${r} 0 0 1 ${60 + r * 0.7} ${60 + r * 0.6}`}
            fill="none"
            stroke={PALETTE.data}
            strokeWidth={1.8}
            opacity={Math.max(0.2, 1 - i * 0.18)}
          />
        ))}
      </svg>
    </div>
  );
}

function ComparisonRadarView({ data }: { data: NonNullable<import("@/types/visualization").MediaStep["comparisonRadar"]> }) {
  return (
    <div className="flex w-full flex-col gap-2.5 px-4">
      <div className="flex items-center justify-between border-b border-outline-variant/50 pb-1">
        <span className="font-hand text-sm font-bold text-primary">Media Performance Radar (Scale 1–10)</span>
        <span className="font-mono text-[10px] text-on-surface-variant/70">10 = Best In Class</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {data.media.map((m, i) => (
          <div key={i} className="flex flex-col rounded border border-outline-variant/60 bg-surface-container-high/40 p-2">
            <span className="font-hand text-xs font-bold" style={{ color: m.color }}>
              {m.name}
            </span>
            <div className="mt-1 flex flex-col gap-1 font-mono text-[10px] text-on-surface-variant/80">
              <div className="flex justify-between">
                <span>Bandwidth:</span>
                <span className="font-bold text-on-surface">{m.bandwidth}/10</span>
              </div>
              <div className="flex justify-between">
                <span>Max Distance:</span>
                <span className="font-bold text-on-surface">{m.maxDistance}/10</span>
              </div>
              <div className="flex justify-between">
                <span>EMI Immunity:</span>
                <span className="font-bold text-on-surface">{m.emiImmunity}/10</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
