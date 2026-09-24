"use client";

// The capstone: the network on top, the packet's full header stack below.
// Fields that changed at this hop glow, so "MACs change every link, IPs
// never do" is something you see rather than memorise. Click any device,
// link or header field.

import { AnimatePresence, motion } from "framer-motion";
import { FitStage } from "@/components/visualizer/FitStage";
import { factSelection } from "@/components/visualizer/lesson/FactBody";
import { NetGraphPanel } from "@/components/visualizer/NetworkCanvas";
import { useJourneyStore } from "@/lib/journeyStore";
import { useLessonUi } from "@/lib/lessonUiStore";
import { PALETTE } from "@/lib/palette";
import type { PduLayer } from "@/types/visualization";

const LAYER_COLOR: Record<PduLayer["layer"], string> = {
  Application: PALETTE.protocol,
  Transport: PALETTE.note,
  Network: PALETTE.data,
  "Data Link": PALETTE.ok,
  Physical: PALETTE.control,
};
const SCOPE: Record<PduLayer["layer"], { unit: string; scope: string }> = {
  Application: { unit: "Unit 5", scope: "end to end — only the two applications read it" },
  Transport: { unit: "Unit 5", scope: "end to end — routers never touch ports or flags" },
  Network: { unit: "Units 2–3", scope: "end to end addresses; TTL drops by one at every router" },
  "Data Link": { unit: "Unit 4", scope: "one link only — rebuilt by every router" },
  Physical: { unit: "Unit 1", scope: "one link only — the medium can differ on every hop" },
};

export function JourneyCanvas() {
  const step = useJourneyStore((s) => s.currentStep());
  const toggleSelect = useLessonUi((s) => s.toggleSelect);
  const selected = useLessonUi((s) => s.selection?.key);
  if (!step) return null;

  return (
    <FitStage>
      <div className="flex w-[980px] flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          {["ARP", "TCP", "IP", "HTTP"].map((ph) => (
            <span key={ph} className={`rounded-full border px-3 py-0.5 font-mono text-[13px] font-bold ${step.phase === ph ? "border-primary bg-primary/15 text-primary" : "border-outline-variant text-on-surface-variant"}`}>
              {ph}
            </span>
          ))}
          <span className="font-hand text-[15px] text-note">packet is at {step.at}</span>
        </div>
        <NetGraphPanel panel={step.panels[0]} w={960} h={200} r={22} compact={false} />
        <div className="grid w-full gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, step.pdu.length)}, minmax(0, 1fr))` }}>
          <AnimatePresence initial={false}>
            {step.pdu.map((l) => {
              const c = LAYER_COLOR[l.layer];
              return (
                <motion.section key={`${l.layer}-${l.name}`} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-lg border-2 border-dashed p-2" style={{ borderColor: `${c}99` }}>
                  <p className="font-label-caps text-[12px] uppercase tracking-wider" style={{ color: c }}>
                    {l.layer}
                  </p>
                  <p className="mb-1.5 font-hand text-[16px] font-bold text-on-surface">{l.name}</p>
                  <div className="flex flex-col gap-1">
                    {l.fields.map(([k, v]) => {
                      const changed = l.changed?.includes(k);
                      const key = `pdu-${l.layer}-${k}`;
                      return (
                        <motion.button
                          type="button"
                          key={k}
                          onClick={() =>
                            toggleSelect(
                              factSelection(key, `${l.layer} · ${SCOPE[l.layer].unit}`, k, c, {
                                lead: `${k} in the ${l.name} header: ${v}.`,
                                rows: [["Value now", v], ["Changed at this hop", changed ? "yes" : "no"], ["Scope", SCOPE[l.layer].scope]],
                                remember: "Per-link: MACs, FCS, TTL. End to end: IP addresses, ports, data.",
                              }),
                            )
                          }
                          initial={false}
                          animate={{ backgroundColor: changed ? `${c}33` : "rgba(0,0,0,0)" }}
                          className={`flex flex-col rounded px-1.5 py-1 text-left hover:brightness-125 ${selected === key ? "outline outline-2 outline-note" : ""}`}
                        >
                          <span className="font-sans text-[12px] text-on-surface-variant">
                            {k}
                            {changed ? " · changed" : ""}
                          </span>
                          <motion.span key={v} initial={{ opacity: 0.2 }} animate={{ opacity: 1 }} className="break-all font-mono text-[12px] font-bold" style={{ color: changed ? c : PALETTE.chalk }}>
                            {v}
                          </motion.span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.section>
              );
            })}
          </AnimatePresence>
        </div>
        <AnimatePresence mode="wait">
          {step.message && (
            <motion.div
              key={step.message.text}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`rounded-full border-[1.5px] border-dashed px-4 py-1.5 font-hand text-[15px] font-bold ${
                step.message.tone === "error" ? "border-coral/70 bg-coral/10 text-coral" : step.message.tone === "ok" ? "border-mint/70 bg-mint/10 text-mint" : "border-amber/70 bg-amber/10 text-amber"
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
