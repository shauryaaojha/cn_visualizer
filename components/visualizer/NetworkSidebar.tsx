"use client";

// Left rail for netEngine leaves: switch topology, inject a fault, re-run.
//
// The Faults block is the part that makes this a simulator. Every engine takes
// the same Fault[], so this section will look identical on the routing and
// error-control screens later.

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { NET_OPERATIONS, netFaults } from "@/engines/netEngine";
import { useNetStore } from "@/lib/netStore";
import type { Fault } from "@/types/visualization";

export function NetworkSidebar() {
  const router = useRouter();
  const params = useNetStore((s) => s.params);
  const run = useNetStore((s) => s.run);

  const options = netFaults(params.op);
  const enabled = (f: Fault) => params.faults.some((x) => x.kind === f.kind && "id" in x && "id" in f && x.id === f.id);

  const toggle = (f: Fault) => {
    const next = enabled(f)
      ? params.faults.filter((x) => !(x.kind === f.kind && "id" in x && "id" in f && x.id === f.id))
      : [...params.faults, f];
    run({ faults: next });
  };

  return (
    <aside className="scroll-thin z-40 flex h-full w-72 shrink-0 flex-col overflow-y-auto border-r border-outline-variant bg-surface-container-low/95 backdrop-blur-xl md:bg-surface-container-low/80">
      <div className="flex flex-1 flex-col gap-md p-md">
        <div className="flex items-center gap-2 border-b border-outline-variant pb-md">
          <Icon name="hub" className="text-[16px] text-primary" />
          <h2 className="font-label-caps text-label-caps text-primary">Topology</h2>
        </div>

        <p className="font-body-sm text-[11px] leading-relaxed text-on-surface-variant/70">
          The same six hosts A–F in every layout, so what changes between them is only the wiring.
        </p>

        <div>
          <label className="mb-1.5 block font-label-caps text-[10px] text-on-surface-variant">LAYOUT</label>
          <div className="grid grid-cols-3 gap-1">
            {NET_OPERATIONS.map((t) => {
              const selected = t.id === params.op;
              return (
                <button
                  key={t.id}
                  onClick={() => router.push(`/topics/fundamentals/${t.subpath}`)}
                  title={t.label}
                  className={`flex flex-col items-center gap-0.5 border px-1 py-1.5 transition-colors ${
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-outline-variant text-on-surface-variant hover:border-primary/60 hover:text-on-surface"
                  }`}
                >
                  <Icon name={t.icon} className="text-[16px]" />
                  <span className="text-center font-label-caps text-[8px] leading-tight">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Faults — break the network on purpose */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 font-label-caps text-[10px] text-coral">
            <Icon name="warning" className="text-[13px]" /> FAULTS
          </label>
          {options.length === 0 ? (
            <p className="font-body-sm text-[11px] leading-relaxed text-on-surface-variant/60">
              This comparison already cuts one link in every topology — that is the whole experiment. Open a single
              layout to choose the fault yourself.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {options.map((o) => {
                const on = enabled(o.fault);
                return (
                  <button
                    key={o.id}
                    onClick={() => toggle(o.fault)}
                    className={`flex items-start gap-2 border px-2 py-2 text-left transition-colors ${
                      on
                        ? "border-coral bg-coral/10 text-coral"
                        : "border-outline-variant text-on-surface-variant hover:border-coral/60"
                    }`}
                  >
                    <Icon
                      name={on ? "check_box" : "check_box_outline_blank"}
                      className="mt-px shrink-0 text-[15px]"
                    />
                    <span className="min-w-0">
                      <span className="block font-label-caps text-[10px] leading-tight">{o.label}</span>
                      <span className="mt-0.5 block font-body-sm text-[10px] leading-snug opacity-70">{o.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
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
