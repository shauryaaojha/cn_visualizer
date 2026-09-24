"use client";

// Routing: the graph on top, every router's table underneath.
//
// Everything is clickable. A router shows its whole table as it stands this
// frame; a link shows its cost and which routes ride on it; a table row shows
// how that metric was worked out (Bellman-Ford) or why it won
// (longest-prefix match), and jumps to the frame where it last changed.

import { AnimatePresence, motion } from "framer-motion";
import { FitStage } from "@/components/visualizer/FitStage";
import { factSelection } from "@/components/visualizer/lesson/FactBody";
import { NetGraphPanel, type NetPick } from "@/components/visualizer/NetworkCanvas";
import { RIP_INFINITY } from "@/engines/routingEngine";
import { routeLinkFact, routeRowFact, routerFact } from "@/engines/routingFacts";
import { useLessonUi } from "@/lib/lessonUiStore";
import { PALETTE } from "@/lib/palette";
import { useRoutingStore } from "@/lib/routingStore";
import type { RoutingStep, RoutingTable, RoutingTableEntry } from "@/types/visualization";

const tone = (state: string | undefined, unreachable: boolean) =>
  unreachable
    ? "border-coral/50 bg-coral/10 text-coral/80"
    : state === "changed"
      ? "border-primary bg-primary/15 text-primary"
      : state === "final"
        ? "border-mint/40 bg-mint/5 text-mint"
        : "border-outline-variant/45 text-on-surface-variant";

const COLS = "grid-cols-[1.25fr_.7fr_.8fr_.7fr]";

export function RoutingCanvas() {
  const step = useRoutingStore((s) => s.currentStep());
  const program = useRoutingStore((s) => s.program);
  const stepIndex = useRoutingStore((s) => s.stepIndex);
  const seek = useRoutingStore((s) => s.seek);
  const forwarding = useRoutingStore((s) => s.params.op === "ipForwarding");
  const toggleSelect = useLessonUi((s) => s.toggleSelect);
  const selected = useLessonUi((s) => s.selection?.key);
  if (!step) return <FitStage><div /></FitStage>;

  const inspect = (pick: NetPick) => {
    if (pick.type === "node") {
      return factSelection(`rt-n-${pick.node.id}`, pick.node.kind === "router" ? "Router" : "Host", pick.node.label, PALETTE.note, routerFact(pick.node.id, step));
    }
    const l = pick.link;
    return factSelection(`rt-l-${l.id}`, "Link", `${l.from} – ${l.to}`, l.state === "down" ? PALETTE.fail : PALETTE.data, routeLinkFact(l, step));
  };

  const clickRow = (table: RoutingTable, e: RoutingTableEntry) => {
    toggleSelect(
      factSelection(
        `rt-row-${table.id}-${e.destination}`,
        forwarding ? "Route" : "Distance-vector entry",
        `${table.routerId} → ${e.destination}`,
        e.metric >= RIP_INFINITY ? PALETTE.fail : PALETTE.data,
        routeRowFact(e, table, forwarding),
      ),
    );
    // Jump back to the most recent frame (up to now) where this entry changed.
    if (!program || forwarding) return;
    for (let i = stepIndex; i >= 0; i--) {
      const row = program.steps[i].tables.find((t) => t.id === table.id)?.entries.find((x) => x.destination === e.destination);
      if (row?.state === "changed") {
        if (i !== stepIndex) seek(i);
        return;
      }
    }
  };

  return (
    <FitStage>
      <div className="flex w-[1180px] flex-col items-center gap-3">
        <NetGraphPanel panel={step.panels[0]} w={760} h={210} r={20} compact={false} protocolPackets inspect={inspect} />
        <RoundChip step={step} />
        <div className={`grid w-full gap-2 ${step.tables.length === 1 ? "max-w-[520px] grid-cols-1" : "grid-cols-3"}`}>
          {step.tables.map((table) => (
            <section
              key={table.id}
              className={`overflow-hidden rounded-md border-[1.5px] border-dashed ${table.focused ? "border-primary/70" : "border-outline-variant"}`}
            >
              <header className="border-b-[1.5px] border-dashed border-outline-variant/70 px-2 py-1.5 font-hand text-[15px] font-bold text-primary">
                {table.title}
              </header>
              <div className={`grid ${COLS} gap-px bg-outline-variant/30 font-mono text-[12px]`}>
                {["DEST", "NEXT", "IFACE", "METRIC"].map((name) => (
                  <span key={name} className="bg-surface-container-high px-1.5 py-1 text-on-surface-variant">
                    {name}
                  </span>
                ))}
              </div>
              <div className="divide-y divide-dashed divide-outline-variant/35">
                <AnimatePresence initial={false}>
                  {table.entries.map((entry) => {
                    const unreachable = entry.metric >= RIP_INFINITY;
                    const key = `rt-row-${table.id}-${entry.destination}`;
                    return (
                      <motion.button
                        type="button"
                        key={`${table.id}-row-${entry.destination}`}
                        layout
                        initial={false}
                        onClick={() => clickRow(table, entry)}
                        animate={{
                          opacity: unreachable ? 0.6 : 1,
                          backgroundColor: entry.state === "changed" ? "rgba(240,210,100,0.13)" : "rgba(0,0,0,0)",
                        }}
                        transition={{ type: "tween", duration: 0.38 }}
                        className={`grid w-full ${COLS} text-left font-mono text-[12px] transition-[filter] hover:brightness-125 ${
                          selected === key ? "outline outline-2 -outline-offset-2 outline-note" : ""
                        }`}
                      >
                        <span className="truncate px-1.5 py-1 text-on-surface">{entry.destination}</span>
                        <span className="truncate px-1.5 py-1 text-on-surface-variant">{entry.nextHop}</span>
                        <span className="truncate px-1.5 py-1 text-on-surface-variant">{entry.outgoingInterface}</span>
                        <motion.span
                          key={`${table.id}-metric-${entry.destination}-${entry.metric}`}
                          initial={{ scale: 0.82 }}
                          animate={{ scale: 1 }}
                          className={`m-0.5 rounded border px-1 py-0.5 text-center ${tone(entry.state, unreachable)}`}
                        >
                          {unreachable ? "16 ∞" : entry.metric}
                        </motion.span>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>
        {step.message && (
          <div
            className={`rounded-full border-[1.5px] border-dashed px-3 py-1 font-hand text-[15px] ${
              step.message.tone === "error" ? "border-coral text-coral" : step.message.tone === "ok" ? "border-mint text-mint" : "border-amber text-amber"
            }`}
          >
            {step.message.text}
          </div>
        )}
      </div>
    </FitStage>
  );
}

function RoundChip({ step }: { step: RoutingStep }) {
  const changed = step.tables.reduce((n, t) => n + t.entries.filter((e) => e.state === "changed").length, 0);
  const forwarding = step.tables.length === 1 && step.tables[0].focused;
  return (
    <div className="flex items-center gap-2 rounded-full border-[1.5px] border-dashed border-outline-variant px-3 py-1 font-hand text-[15px] text-note">
      {forwarding
        ? `Hop ${step.round} · ${step.tables[0].routerId} is deciding`
        : step.converged
          ? `Converged after round ${step.round}`
          : `Round ${step.round} — ${changed} entries changed`}
    </div>
  );
}
