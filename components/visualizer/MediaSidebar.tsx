"use client";

import { Icon } from "@/components/ui/Icon";
import { Chips, Field } from "@/components/ui/Field";
import { useMediaStore } from "@/lib/mediaStore";

export function MediaSidebar() {
  const params = useMediaStore((s) => s.params);
  const run = useMediaStore((s) => s.run);

  return (
    <aside className="scroll-thin z-40 flex h-full w-72 shrink-0 flex-col overflow-y-auto border-r border-outline-variant bg-surface-container-low/95 backdrop-blur-xl md:bg-surface-container-low/80">
      <div className="flex flex-1 flex-col gap-md p-md">
        <div className="flex items-center gap-2 border-b border-outline-variant pb-md">
          <Icon name="cable" className="text-[16px] text-primary" />
          <h2 className="font-hand text-[21px] font-bold text-primary">Transmission Media</h2>
        </div>


        {params.op === "signalBasics" && (
          <Field label="Signal Encoding" hint="Select the encoding technique applied to digital bits.">
            <Chips
              value={params.signalType || "manchester"}
              onChange={(v) => run({ signalType: v as "nrz" | "manchester" | "am" | "fm" | "qam" })}
              columns={2}
              options={[
                { value: "manchester", label: "Manchester" },
                { value: "nrz", label: "NRZ-L" },
                { value: "am", label: "AM (Analog)" },
                { value: "fm", label: "FM (Analog)" },
              ]}
            />
          </Field>
        )}

        {params.op === "guidedTwistedPair" && (
          <>
            <Field label="Twist Rate (twists/m)" hint="More twists per meter improve electromagnetic rejection.">
              <input
                type="range"
                min={2}
                max={16}
                step={2}
                value={params.twistRate ?? 8}
                onChange={(e) => run({ twistRate: Number(e.target.value) })}
                className="w-full accent-primary"
              />
              <span className="font-mono text-xs text-primary">{params.twistRate ?? 8} twists/m</span>
            </Field>

            <Field label="External Noise Level" hint="Simulate nearby motor or electrical interference.">
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={params.noiseLevel ?? 0.5}
                onChange={(e) => run({ noiseLevel: Number(e.target.value) })}
                className="w-full accent-coral"
              />
              <span className="font-mono text-xs text-coral">{(params.noiseLevel ?? 0.5) * 100}% EMI Noise</span>
            </Field>
          </>
        )}

        {params.op === "guidedFiber" && (
          <>
            <Field label="Launch Angle θ (°)" hint="Must be >= critical angle for Total Internal Reflection.">
              <input
                type="range"
                min={60}
                max={89}
                step={1}
                value={params.launchAngleDeg ?? 83}
                onChange={(e) => run({ launchAngleDeg: Number(e.target.value) })}
                className="w-full accent-mint"
              />
              <span className="font-mono text-xs text-mint">{params.launchAngleDeg ?? 83}°</span>
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Core n1">
                <input
                  type="number"
                  step={0.01}
                  min={1.45}
                  max={1.60}
                  value={params.coreIndex ?? 1.48}
                  onChange={(e) => run({ coreIndex: Number(e.target.value) })}
                  className="rounded border border-outline-variant bg-surface-container px-2 py-1 font-mono text-xs"
                />
              </Field>
              <Field label="Cladding n2">
                <input
                  type="number"
                  step={0.01}
                  min={1.40}
                  max={1.47}
                  value={params.claddingIndex ?? 1.46}
                  onChange={(e) => run({ claddingIndex: Number(e.target.value) })}
                  className="rounded border border-outline-variant bg-surface-container px-2 py-1 font-mono text-xs"
                />
              </Field>
            </div>
          </>
        )}

        {params.op === "unguidedMicrowave" && (
          <Field label="Rain Intensity (Rain Fade)" hint="Water droplets absorb and scatter high-frequency microwave energy.">
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={params.rainIntensity ?? 0.2}
              onChange={(e) => run({ rainIntensity: Number(e.target.value) })}
              className="w-full accent-coral"
            />
            <span className="font-mono text-xs text-coral">Rain Fade: {((params.rainIntensity ?? 0.2) * 15).toFixed(1)} dB loss</span>
          </Field>
        )}
      </div>
    </aside>
  );
}
