"use client";

import { Icon } from "@/components/ui/Icon";
import { useLayerStore } from "@/lib/layerStore";

const LEGEND = [
  { label: "AH / PH / SH", tone: "text-violet border-violet/40 bg-violet/10", what: "OSI layers 7–6–5. In the real TCP/IP stack these three are one layer and add no header at all." },
  { label: "TCP", tone: "text-amber border-amber/40 bg-amber/10", what: "Ports, sequence and ACK numbers. 20 bytes." },
  { label: "IP", tone: "text-primary border-primary/40 bg-primary/10", what: "Source and destination IP, TTL. 20 bytes — what routers read." },
  { label: "MAC / FCS", tone: "text-mint border-mint/40 bg-mint/10", what: "Local hop addressing plus a CRC. Rewritten at every hop." },
];

export function LayerSidebar() {
  const run = useLayerStore((s) => s.run);

  return (
    <aside className="scroll-thin z-40 flex h-full w-72 shrink-0 flex-col overflow-y-auto border-r-[1.5px] border-dashed border-outline-variant bg-surface-container-low/95 backdrop-blur-xl md:bg-surface-container-low/80">
      <div className="flex flex-1 flex-col gap-md p-md">
        <div className="flex items-center gap-2 border-b-[1.5px] border-dashed border-outline-variant pb-md">
          <Icon name="layers" className="text-[16px] text-primary" />
          <h2 className="font-hand text-[17px] font-bold text-primary">Encapsulation</h2>
        </div>

        <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
          One word — <span className="font-bold text-mint">HELLO</span> — walks down the sender&apos;s seven layers,
          crosses the medium as bits, and climbs the receiver&apos;s seven layers back. Each layer only ever talks to
          its own opposite number.
        </p>

        <div>
          <label className="mb-1.5 block font-label-caps text-[9px] uppercase tracking-[0.08em] text-on-surface-variant/70">HEADERS</label>
          <div className="flex flex-col gap-1.5">
            {LEGEND.map((l) => (
              <div key={l.label} className="rounded-md border-[1.5px] border-dashed border-outline-variant px-2 py-1.5">
                <span className={`inline-block rounded-sm border-[1.5px] border-dashed px-1.5 py-px font-mono text-[10px] font-bold ${l.tone}`}>
                  {l.label}
                </span>
                <p className="mt-1 font-body-sm text-[12px] leading-snug text-on-surface-variant/75">{l.what}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border-l-[3px] border-coral/70 bg-coral/[0.07] px-2.5 py-2">
          <p className="font-label-caps text-[9px] uppercase tracking-wider text-coral">The cost</p>
          <p className="mt-1 font-body-sm text-[12.5px] leading-snug text-on-surface-variant/85">
            5 bytes of payload leave the machine wrapped in 58 bytes of headers. Layering is not free — it is bought
            with overhead, and paid for in flexibility.
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
