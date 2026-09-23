"use client";

// Both links are fully editable, which turns this page from a demo into a
// calculator: put your own bandwidth and distance numbers in and the delay
// maths, the pipe geometry and the verdict all follow.

import { Icon } from "@/components/ui/Icon";
import { Chips, Field, NumberInput } from "@/components/ui/Field";
import {
  FILE_PRESETS,
  LINK_PRESETS,
  MAX_KB,
  MAX_MBPS,
  MAX_PROP,
  MIN_KB,
  MIN_MBPS,
  MIN_PROP,
  type LinkSpec,
} from "@/engines/signalEngine";
import { useSignalStore } from "@/lib/signalStore";

export function SignalSidebar() {
  const params = useSignalStore((s) => s.params);
  const run = useSignalStore((s) => s.run);

  return (
    <aside className="scroll-thin z-40 flex h-full w-72 shrink-0 flex-col overflow-y-auto border-r border-outline-variant bg-surface-container-low/95 backdrop-blur-xl md:bg-surface-container-low/80">
      <div className="flex flex-1 flex-col gap-md p-md">
        <div className="flex items-center gap-2 border-b border-outline-variant pb-md">
          <Icon name="speed" className="text-[16px] text-primary" />
          <h2 className="font-hand text-[21px] font-bold text-primary">Bandwidth vs Latency</h2>
        </div>


        <Field label="File size" hint="Small files are decided by latency, large ones by bandwidth.">
          <Chips
            value={params.fileKB}
            onChange={(fileKB) => run({ fileKB })}
            columns={3}
            options={FILE_PRESETS.map((p) => ({ value: p.kb, label: p.label, title: p.what }))}
          />
          <div className="mt-1">
            <NumberInput
              value={params.fileKB}
              min={MIN_KB}
              max={MAX_KB}
              onCommit={(fileKB) => run({ fileKB })}
              suffix="KB"
            />
          </div>
        </Field>

        <LinkEditor
          which="a"
          spec={params.a}
          accent="text-primary border-primary"
          onChange={(a) => run({ a })}
        />
        <LinkEditor which="b" spec={params.b} accent="text-amber border-amber" onChange={(b) => run({ b })} />

        <div className="rounded-md border-l-[3px] border-mint/70 bg-mint/[0.07] px-2.5 py-2">
          <p className="font-label-caps text-[12px] uppercase tracking-wider text-mint">The rule</p>
          <p className="mt-1 font-body-sm text-[13px] leading-snug text-on-surface-variant/85">
            Bandwidth decides how much you can push per second. Latency decides how long the first bit takes to
            arrive. No amount of bandwidth shortens a 300 ms trip to orbit.
          </p>
        </div>

        <button
          onClick={() => run()}
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-md border border-primary py-2.5 font-sans text-[15px] font-bold text-primary transition-colors hover:bg-primary hover:text-surface active:scale-[0.98]"
        >
          <Icon name="play_circle" className="text-[18px]" /> Re-run
        </button>
      </div>
    </aside>
  );
}

function LinkEditor({
  which,
  spec,
  accent,
  onChange,
}: {
  which: "a" | "b";
  spec: LinkSpec;
  accent: string;
  onChange: (s: LinkSpec) => void;
}) {
  return (
    <div className="rounded-md border border-outline-variant p-2">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className={`font-sans text-[15px] font-bold ${accent.split(" ")[0]}`}>
          Link {which.toUpperCase()} — {spec.label}
        </span>
      </div>

      {/* Presets fill the numbers; the numbers stay editable afterwards. */}
      <div className="mb-2 grid grid-cols-4 gap-1">
        {LINK_PRESETS.map((p) => {
          const on = p.label === spec.label && p.bandwidthMbps === spec.bandwidthMbps && p.propagationMs === spec.propagationMs;
          return (
            <button
              key={p.label}
              title={p.hint}
              onClick={() =>
                onChange({ label: p.label, bandwidthMbps: p.bandwidthMbps, propagationMs: p.propagationMs })
              }
              className={`rounded-md border px-1 py-1 font-mono text-[12px] transition-colors ${
                on
                  ? `${accent} bg-white/[0.06]`
                  : " border-outline-variant text-on-surface-variant hover:border-primary/60"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Bandwidth">
          <NumberInput
            value={spec.bandwidthMbps}
            min={MIN_MBPS}
            max={MAX_MBPS}
            step={1}
            suffix="Mb/s"
            onCommit={(bandwidthMbps) => onChange({ ...spec, bandwidthMbps })}
          />
        </Field>
        <Field label="One-way delay">
          <NumberInput
            value={spec.propagationMs}
            min={MIN_PROP}
            max={MAX_PROP}
            step={1}
            suffix="ms"
            onCommit={(propagationMs) => onChange({ ...spec, propagationMs })}
          />
        </Field>
      </div>
    </div>
  );
}
