"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FitStage } from "@/components/visualizer/FitStage";
import { NetGraphPanel } from "@/components/visualizer/NetworkCanvas";
import { useRoutingStore } from "@/lib/routingStore";
import { RIP_INFINITY } from "@/engines/routingEngine";

const tone = (state: string | undefined, unreachable: boolean) =>
  unreachable
    ? "border-coral/50 bg-coral/10 text-coral/75"
    : state === "changed"
      ? "border-primary bg-primary/15 text-primary"
      : state === "final"
        ? "border-mint/40 bg-mint/5 text-mint"
        : "border-outline-variant/45 text-on-surface-variant";

export function RoutingCanvas() {
  const step = useRoutingStore((s) => s.currentStep());
  if (!step) return <FitStage><div /></FitStage>;

  return (
    <FitStage>
      <div className="flex w-[1120px] flex-col items-center gap-3">
        <NetGraphPanel panel={step.panels[0]} w={720} h={210} r={18} compact={false} protocolPackets />
        <div className="flex items-center gap-2 rounded-full border-[1.5px] border-dashed border-outline-variant px-3 py-1 font-hand text-[13px] text-note">
          {step.converged ? `Converged after round ${step.round}` : `Round ${step.round} — ${step.tables.reduce((n, t) => n + t.entries.filter((e) => e.state === "changed").length, 0)} entries changed`}
        </div>
        <div className="grid w-full grid-cols-4 gap-2">
          {step.tables.map((table) => (
            <section key={table.id} className={`overflow-hidden rounded-md border-[1.5px] border-dashed ${table.focused ? "border-primary/70" : "border-outline-variant"}`}>
              <header className="border-b-[1.5px] border-dashed border-outline-variant/70 px-2 py-1.5 font-hand text-[13px] font-bold text-primary">
                {table.title}
              </header>
              <div className="grid grid-cols-[1.1fr_.65fr_.85fr_.48fr] gap-px bg-outline-variant/30 font-mono text-[8px]">
                {['DEST', 'NEXT', 'IFACE', 'METRIC'].map((name) => <span key={name} className="bg-surface-container-high px-1.5 py-1 text-on-surface-variant">{name}</span>)}
              </div>
              <div className="divide-y divide-dashed divide-outline-variant/35">
                <AnimatePresence initial={false}>
                  {table.entries.map((entry) => {
                    const unreachable = entry.metric >= RIP_INFINITY;
                    return (
                      <motion.div
                        key={`${table.id}-row-${entry.destination}`}
                        layout
                        initial={false}
                        animate={{ opacity: unreachable ? 0.55 : 1, backgroundColor: entry.state === "changed" ? "rgba(240,210,100,0.13)" : "rgba(0,0,0,0)" }}
                        transition={{ type: "tween", duration: 0.38 }}
                        className="grid grid-cols-[1.1fr_.65fr_.85fr_.48fr] font-mono text-[9px]"
                      >
                        <span className="truncate px-1.5 py-1 text-on-surface">{entry.destination}</span>
                        <span className="truncate px-1.5 py-1 text-on-surface-variant">{entry.nextHop}</span>
                        <span className="truncate px-1.5 py-1 text-on-surface-variant">{entry.outgoingInterface}</span>
                        <motion.span layout key={`${table.id}-metric-${entry.destination}-${entry.metric}`} initial={{ scale: 0.82 }} animate={{ scale: 1 }} className={`m-0.5 rounded border px-1 py-0.5 text-center ${tone(entry.state, unreachable)}`}>{unreachable ? '16 ∞' : entry.metric}</motion.span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>
        {step.message && (
          <div className={`rounded-full border-[1.5px] border-dashed px-3 py-1 font-hand text-[13px] ${step.message.tone === "error" ? "border-coral text-coral" : step.message.tone === "ok" ? "border-mint text-mint" : "border-amber text-amber"}`}>
            {step.message.text}
          </div>
        )}
      </div>
    </FitStage>
  );
}
