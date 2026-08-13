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
    <aside className="scroll-thin z-40 flex h-full w-72 shrink-0 flex-col overflow-y-auto border-r border-outline-variant bg-surface-container-low/95 backdrop-blur-xl md:bg-surface-container-low/80">
      <div className="flex flex-1 flex-col gap-md p-md">
        <div className="flex items-center gap-2 border-b border-outline-variant pb-md">
          <Icon name="speed" className="text-[16px] text-primary" />
          <h2 className="font-label-caps text-label-caps text-primary">Bandwidth vs Latency</h2>
        </div>

        <p className="font-body-sm text-[11px] leading-relaxed text-on-surface-variant/70">
          Both links run at exactly <span className="font-bold text-primary">100 Mbps</span>. The only difference is
          how far the bits must travel. Change the file size and watch the verdict flip.
        </p>

        <div>
          <label className="mb-1.5 block font-label-caps text-[10px] text-on-surface-variant">FILE SIZE</label>
          <div className="flex flex-col gap-1">
            {FILE_PRESETS.map((p) => {
              const selected = p.kb === params.fileKB;
              return (
                <button
                  key={p.kb}
                  onClick={() => run({ fileKB: p.kb })}
                  className={`flex items-baseline justify-between border px-2.5 py-2 transition-colors ${
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-outline-variant text-on-surface-variant hover:border-primary/60 hover:text-on-surface"
                  }`}
                >
                  <span className="font-mono text-[13px] font-bold">{p.label}</span>
                  <span className="font-body-sm text-[10px] opacity-70">{p.what}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block font-label-caps text-[10px] text-on-surface-variant">THE TWO LINKS</label>
          <div className="flex flex-col gap-1.5 font-body-sm text-[10px] leading-snug">
            <div className="border-l-2 border-primary bg-primary/5 px-2 py-1.5">
              <span className="font-label-caps text-[9px] text-primary">FIBRE</span>
              <p className="text-on-surface-variant/70">400 km of ground fibre. 2 ms each way.</p>
            </div>
            <div className="border-l-2 border-amber bg-amber/5 px-2 py-1.5">
              <span className="font-label-caps text-[9px] text-amber">SATELLITE</span>
              <p className="text-on-surface-variant/70">
                Up to geostationary orbit and back — 72 000 km. 300 ms each way, no matter how fast the link is.
              </p>
            </div>
          </div>
        </div>

        <div className="border-l-2 border-mint/60 bg-mint/5 px-2.5 py-2">
          <p className="font-label-caps text-[9px] tracking-wider text-mint">THE RULE</p>
          <p className="mt-1 font-body-sm text-[10.5px] leading-snug text-on-surface-variant/75">
            Bandwidth decides how much you can push per second. Latency decides how long the first bit takes to
            arrive. Small transfers are dominated by latency; large ones by bandwidth.
          </p>
        </div>

        <button
          onClick={() => run()}
          className="mt-auto flex w-full items-center justify-center gap-2 bg-primary-container py-2.5 font-label-caps text-label-caps text-surface transition-transform hover:bg-opacity-90 active:scale-[0.98]"
        >
          <Icon name="play_circle" className="text-[18px]" /> Re-run
        </button>
      </div>
    </aside>
  );
}
