"use client";

// File size is the only knob — and it is the whole experiment. Small file,
// latency wins; big file, bandwidth wins. Same two links either way.

import { Icon } from "@/components/ui/Icon";
import { FILE_PRESETS } from "@/engines/signalEngine";
import { useSignalStore } from "@/lib/signalStore";

export function SignalSidebar() {
  const params = useSignalStore((s) => s.params);
  const run = useSignalStore((s) => s.run);

  return (
    <aside className="scroll-thin z-40 flex h-full w-72 shrink-0 flex-col overflow-y-auto border-r-[1.5px] border-dashed border-outline-variant bg-surface-container-low/95 backdrop-blur-xl md:bg-surface-container-low/80">
      <div className="flex flex-1 flex-col gap-md p-md">
        <div className="flex items-center gap-2 border-b-[1.5px] border-dashed border-outline-variant pb-md">
          <Icon name="speed" className="text-[16px] text-primary" />
          <h2 className="font-hand text-[17px] font-bold text-primary">Bandwidth vs Latency</h2>
        </div>

        <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
          Both links run at exactly <span className="font-bold text-primary">100 Mbps</span>. The only difference is
          how far the bits must travel. Change the file size and watch the verdict flip.
        </p>

        <div>
          <label className="mb-1.5 block font-label-caps text-[9px] uppercase tracking-[0.08em] text-on-surface-variant/70">FILE SIZE</label>
          <div className="flex flex-col gap-1">
            {FILE_PRESETS.map((p) => {
              const selected = p.kb === params.fileKB;
              return (
                <button
                  key={p.kb}
                  onClick={() => run({ fileKB: p.kb })}
                  className={`flex items-baseline justify-between rounded-md border-[1.5px] border-dashed px-2.5 py-2 transition-colors ${
                    selected
                      ? "border-[1.5px] border-primary bg-primary/12 text-primary"
                      : "border-outline-variant text-on-surface-variant hover:border-primary/60 hover:text-on-surface"
                  }`}
                >
                  <span className="font-mono text-[13px] font-bold">{p.label}</span>
                  <span className="font-body-sm text-[12px] opacity-75">{p.what}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block font-label-caps text-[9px] uppercase tracking-[0.08em] text-on-surface-variant/70">THE TWO LINKS</label>
          <div className="flex flex-col gap-1.5 font-body-sm text-[12px] leading-snug">
            <div className="rounded-md border-l-[3px] border-primary bg-primary/[0.07] px-2 py-1.5">
              <span className="font-label-caps text-[9px] uppercase text-primary">Fibre</span>
              <p className="text-on-surface-variant/80">400 km of ground fibre. 2 ms each way.</p>
            </div>
            <div className="rounded-md border-l-[3px] border-amber bg-amber/[0.07] px-2 py-1.5">
              <span className="font-label-caps text-[9px] uppercase text-amber">Satellite</span>
              <p className="text-on-surface-variant/80">
                Up to geostationary orbit and back — 72 000 km. 300 ms each way, no matter how fast the link is.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-md border-l-[3px] border-mint/70 bg-mint/[0.07] px-2.5 py-2">
          <p className="font-label-caps text-[9px] uppercase tracking-wider text-mint">The rule</p>
          <p className="mt-1 font-body-sm text-[12.5px] leading-snug text-on-surface-variant/85">
            Bandwidth decides how much you can push per second. Latency decides how long the first bit takes to
            arrive. Small transfers are dominated by latency; large ones by bandwidth.
          </p>
        </div>

        <button
          onClick={() => run()}
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-md border-[1.5px] border-primary py-2.5 font-hand text-[15px] font-bold text-primary transition-colors hover:bg-primary hover:text-surface active:scale-[0.98]"
        >
          <Icon name="play_circle" className="text-[18px]" /> Re-run
        </button>
      </div>
    </aside>
  );
}
