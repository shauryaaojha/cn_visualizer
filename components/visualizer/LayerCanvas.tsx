"use client";

// The OSI stack, drawn as the diagram everyone already has in their head:
// two mirrored towers with the medium joining them at the bottom.
//
// The PDU lives in the middle column and moves vertically to whichever lane is
// currently processing it, hugging the sender's side on the way down and the
// receiver's on the way up. Headers are chips in a flex row with `layout`
// animation, so adding MAC pushes IP/TCP/payload sideways instead of redrawing
// — which is exactly the mental model of wrapping something.

import { AnimatePresence, motion } from "framer-motion";
import { FitStage } from "@/components/visualizer/FitStage";
import { useLayerStore } from "@/lib/layerStore";
import { PALETTE } from "@/lib/palette";
import type { HeaderTone, LayerLane, PduHeader } from "@/types/visualization";

const ROW_H = 44;
const STACK_W = 178;
const MID_W = 470;
const W = STACK_W * 2 + MID_W;

const TONE_CHIP: Record<HeaderTone, string> = {
  signal: "border-primary bg-primary/15 text-primary",
  amber: "border-amber bg-amber/15 text-amber",
  mint: "border-mint bg-mint/15 text-mint",
  violet: "border-violet bg-violet/15 text-violet",
  coral: "border-coral bg-coral/15 text-coral",
};

const LANE_STYLE: Record<LayerLane["state"], string> = {
  idle: "border-outline-variant/50 bg-surface-container/30 text-on-surface-variant/55",
  active: "border-primary bg-primary/12 text-primary shadow-[0_0_16px_rgba(240,210,100,0.2)]",
  done: "border-outline-variant bg-surface-container/60 text-on-surface-variant/85",
};

export function LayerCanvas() {
  const step = useLayerStore((s) => s.currentStep());
  if (!step) return null;

  const { lanes, at, side, headers, payload, trailer, bits, addedId, removedId } = step;
  const laneIdx = Math.max(
    0,
    lanes.findIndex((l) => l.n === at),
  );
  const onWire = side === "wire" || at === 0;
  const pduY = onWire ? lanes.length * ROW_H + 14 : laneIdx * ROW_H;

  const noted =
    (addedId && headers.find((h) => h.id === addedId)) ||
    (removedId === trailer?.id ? trailer : undefined);

  return (
    <FitStage>
      <div className="flex flex-col items-center gap-2" style={{ width: W }}>
        {/* Column captions */}
        <div className="flex w-full items-center">
          <div className="flex items-center gap-2" style={{ width: STACK_W }}>
            <span
              className={`font-label-caps text-label-caps ${side === "sender" ? "text-primary" : "text-on-surface-variant/45"}`}
            >
              SENDER
            </span>
          </div>
          <div className="flex justify-center" style={{ width: MID_W }}>
            <span className="font-label-caps text-[10px] tracking-widest text-on-surface-variant/45">
              {onWire ? "ON THE MEDIUM" : side === "sender" ? "ENCAPSULATING ↓" : "DECAPSULATING ↑"}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2" style={{ width: STACK_W }}>
            <span
              className={`font-label-caps text-label-caps ${side === "receiver" ? "text-primary" : "text-on-surface-variant/45"}`}
            >
              RECEIVER
            </span>
          </div>
        </div>

        <div className="relative" style={{ width: W, height: lanes.length * ROW_H + 78 }}>
          {/* The two towers */}
          {lanes.map((l, i) => (
            <div key={l.n} className="absolute flex" style={{ top: i * ROW_H, width: W, height: ROW_H }}>
              <LaneBox lane={l} active={side === "sender" && l.n === at} width={STACK_W} align="left" />
              <div style={{ width: MID_W }} />
              <LaneBox lane={l} active={side === "receiver" && l.n === at} width={STACK_W} align="right" />
            </div>
          ))}

          {/* The medium joining the two towers */}
          <div
            className="absolute flex items-center"
            style={{ top: lanes.length * ROW_H + 6, left: 0, width: W, height: 34 }}
          >
            <div style={{ width: STACK_W / 2 }} />
            <div
              className="h-[3px] flex-1 rounded-full transition-all duration-500"
              style={
                onWire
                  ? {
                      backgroundImage: `linear-gradient(90deg, ${PALETTE.data} 0 60%, transparent 60% 100%)`,
                      backgroundSize: "14px 3px",
                      boxShadow: `0 0 10px ${PALETTE.data}88`,
                    }
                  : { background: PALETTE.wire, opacity: 0.5 }
              }
            />
            <div style={{ width: STACK_W / 2 }} />
          </div>

          {/* The PDU itself */}
          <motion.div
            initial={false}
            animate={{
              top: pduY,
              left: onWire ? STACK_W : side === "sender" ? STACK_W - 6 : STACK_W + 6,
            }}
            transition={{ type: "spring", stiffness: 150, damping: 22 }}
            className="absolute flex items-center justify-center"
            style={{ width: MID_W, height: ROW_H }}
          >
            {onWire && bits ? (
              <div className="flex max-w-full items-center gap-2 overflow-hidden rounded-md border-[1.5px] border-dashed border-primary/60 bg-black/25 px-3 py-1.5">
                <span className="shrink-0 font-label-caps text-[9px] uppercase text-primary/70">Bits</span>
                <span className="truncate font-mono text-[11px] tracking-tight text-primary">{bits}</span>
              </div>
            ) : (
              <motion.div layout className="flex items-center gap-[3px]">
                <AnimatePresence mode="popLayout">
                  {headers.map((h) => (
                    <HeaderChip key={h.id} h={h} flash={h.id === addedId} />
                  ))}
                </AnimatePresence>
                <motion.div
                  layout
                  className="flex h-8 items-center justify-center rounded-sm border-2 border-mint bg-mint/20 px-3 font-mono text-[13px] font-bold text-mint"
                >
                  {payload}
                </motion.div>
                <AnimatePresence mode="popLayout">
                  {trailer && <HeaderChip key={trailer.id} h={trailer} flash={trailer.id === addedId} />}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* What the header just added actually carries */}
        <div className="flex min-h-[34px] w-full max-w-[760px] items-start justify-center px-4">
          <AnimatePresence mode="wait">
            {noted?.note && (
              <motion.p
                key={noted.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center font-body-sm text-[11.5px] leading-relaxed text-on-surface-variant/70"
              >
                <span className={`mr-1.5 font-bold ${TONE_TEXT[noted.tone]}`}>{noted.label}</span>
                {noted.note}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {step.message && (
            <motion.div
              key={step.message.text}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`rounded-full border-[1.5px] border-dashed px-4 py-1.5 font-hand text-[15px] font-bold ${
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

const TONE_TEXT: Record<HeaderTone, string> = {
  signal: "text-primary",
  amber: "text-amber",
  mint: "text-mint",
  violet: "text-violet",
  coral: "text-coral",
};

function HeaderChip({ h, flash }: { h: PduHeader; flash?: boolean }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.5, width: 0 }}
      animate={{ opacity: 1, scale: 1, width: "auto" }}
      exit={{ opacity: 0, scale: 0.5, width: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={`flex h-8 items-center justify-center overflow-hidden rounded-sm border-2 px-2 font-mono text-[11px] font-bold ${TONE_CHIP[h.tone]} ${
        flash ? "shadow-[0_0_16px_rgba(255,255,255,0.18)]" : ""
      }`}
    >
      {h.label}
    </motion.div>
  );
}

function LaneBox({
  lane,
  active,
  width,
  align,
}: {
  lane: LayerLane;
  active: boolean;
  width: number;
  align: "left" | "right";
}) {
  const state: LayerLane["state"] = active ? "active" : lane.state === "active" ? "done" : lane.state;
  return (
    <div className="px-1 py-[3px]" style={{ width }}>
      <div
        className={`flex h-full items-center gap-2 rounded-md border-[1.5px] border-dashed px-2 transition-all duration-300 ${LANE_STYLE[state]} ${
          align === "right" ? "flex-row-reverse text-right" : ""
        }`}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-current/50 font-mono text-[11px] font-bold">
          {lane.n}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-hand text-[13px] font-bold leading-tight">{lane.name}</p>
          <p className="truncate font-mono text-[9px] leading-tight opacity-60">{lane.pduName}</p>
        </div>
      </div>
    </div>
  );
}
