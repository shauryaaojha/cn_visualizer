"use client";

// The layer stack, rebuilt to be poked at.
//
//  ┌ SENDER ┐                                        ┌ RECEIVER ┐
//  │ 7 App  │   message: [ HELLO      ] ↵             │  App 7   │
//  │ 6 Pres │                                        │  Pres 6  │
//  │  …     │   ┌MAC─┬IP──┬TCP─┬SH┬PH┬AH┬HELLO┬PAD┬FCS┐ ← the PDU,   │
//  │ 2 Link │   └────┴────┴────┴──┴──┴──┴─────┴───┴───┘   drawn to scale │
//  │ 1 Phys │                                        │  Phys 1  │
//  └────────┘════════ 01001000 01000101 … ═══════════└──────────┘
//
// Everything is clickable. A layer jumps the lesson to the moment the PDU is
// there and opens its facts in the Inspector; a header opens its real fields
// (your ports, your IPs). Header widths are proportional to their size in
// bytes, so "five characters leave as a 64-byte frame" is something you see
// before anyone says it.

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { FitStage } from "@/components/visualizer/FitStage";
import { Icon } from "@/components/ui/Icon";
import { LAYER_FACTS, headerFacts } from "@/engines/layerFacts";
import { useLayerStore } from "@/lib/layerStore";
import { useLessonUi, type Selection } from "@/lib/lessonUiStore";
import { PALETTE } from "@/lib/palette";
import type { HeaderTone, LayerLane, LayerStep, PduHeader } from "@/types/visualization";

const W = 1180;
const TOWER_W = 256;
const TOWER_H = 476;
/** Tour lessons (OSI, TCP/IP) have no receiver; this card takes its place. */
const SPOT_W = 380;
/** Narrowest a segment may get and still show its label. */
const SEG_MIN_W = 46;
/** OSI 5–7 headers have no real size; draw them a fixed, honest-looking width. */
const NOTIONAL_W = 40;
const PAYLOAD_MIN_W = 64;

const TONE_HEX: Record<HeaderTone, string> = {
  signal: PALETTE.data,
  amber: PALETTE.control,
  mint: PALETTE.ok,
  violet: PALETTE.protocol,
  coral: PALETTE.fail,
};

/** A lane wears the colour of the header it adds. */
const LANE_HEX: Record<string, string> = {
  Application: PALETTE.protocol,
  Presentation: PALETTE.protocol,
  Session: PALETTE.protocol,
  Transport: PALETTE.control,
  Network: PALETTE.data,
  Internet: PALETTE.data,
  "Data Link": PALETTE.ok,
  "Network Access": PALETTE.ok,
  Physical: PALETTE.fail,
};

type Side = "sender" | "receiver";

export function LayerCanvas() {
  const program = useLayerStore((s) => s.program);
  const stepIndex = useLayerStore((s) => s.stepIndex);
  const params = useLayerStore((s) => s.params);
  const seek = useLayerStore((s) => s.seek);
  const toggleSelect = useLessonUi((s) => s.toggleSelect);
  const selection = useLessonUi((s) => s.selection);
  const reduce = useReducedMotion();

  const step = program?.steps[Math.min(stepIndex, (program?.steps.length ?? 1) - 1)];
  if (!program || !step) return null;

  const { lanes, at, side, headers, payload, trailer, bits, addedId, removedId } = step;
  const hasReceiver = program.steps.some((s) => s.side === "receiver");
  const rowH = TOWER_H / lanes.length;
  const MID_W = hasReceiver ? W - TOWER_W * 2 : W - TOWER_W - SPOT_W - 24;
  const PDU_MAX_W = MID_W - 90;
  const onWire = side === "wire" || at === 0;
  const laneIdx = Math.max(
    0,
    lanes.findIndex((l) => l.n === at),
  );
  const pduY = onWire ? TOWER_H + 12 : laneIdx * rowH + rowH / 2;

  // --- byte-true widths ---
  const bytes = payload.length;
  const fixed = 58; // TCP + IP + Ethernet + FCS
  const padding = params.op === "encapsulation" ? Math.max(0, 64 - (bytes + fixed)) : 0;
  const scale = Math.min(9, (PDU_MAX_W - 3 * NOTIONAL_W - PAYLOAD_MIN_W) / (fixed + padding + 1));
  const showPad = !!trailer && padding > 0 && !(side === "sender" && at === 2 && step.label !== "pad");
  const rawOf = (h: PduHeader) => {
    const b = headerFacts(h.id, params)?.bytes;
    return b ? Math.max(SEG_MIN_W, b * scale) : NOTIONAL_W;
  };
  const payloadRaw = Math.max(PAYLOAD_MIN_W, bytes * scale);
  const padRaw = Math.max(SEG_MIN_W, padding * scale);
  // Minimum widths can push a long message past the column; if so, shrink
  // every segment by the same factor so proportions survive.
  const rawTotal =
    headers.reduce((n, h) => n + rawOf(h), 0) + payloadRaw + (showPad ? padRaw : 0) + (trailer ? rawOf(trailer) : 0);
  const fit = Math.min(1, PDU_MAX_W / rawTotal);
  const widthOf = (h: PduHeader) => rawOf(h) * fit;

  // --- interactions ---
  const findStep = (n: number, s: Side) => program.steps.findIndex((st) => st.at === n && st.side === s);

  const layerSelection = (lane: LayerLane): Selection => {
    const fact = LAYER_FACTS[lane.name];
    const color = LANE_HEX[lane.name];
    return {
      key: `layer-${lane.n}`,
      kind: `Layer ${lane.n}`,
      title: lane.name,
      color,
      body: (
        <div className="flex flex-col gap-3">
          <p className="text-on-surface">{fact?.job ?? lane.role}</p>
          <Fact label="Its data is called">
            <span className="font-mono text-on-surface">{lane.pduName}</span>
          </Fact>
          {fact && (
            <>
              <Fact label="Protocols">
                <Chips items={fact.protocols} color={color} />
              </Fact>
              <Fact label="Devices">
                <Chips items={fact.devices} />
              </Fact>
              <p className="rounded-md bg-surface-container-high px-3 py-2 text-[13px] text-on-surface">
                <span className="font-semibold text-note">Remember · </span>
                {fact.remember}
              </p>
            </>
          )}
        </div>
      ),
    };
  };

  const headerSelection = (h: PduHeader): Selection => {
    const f = headerFacts(h.id, params);
    const color = TONE_HEX[h.tone];
    return {
      key: `header-${h.id}`,
      kind: f?.bytes ? `Header · ${f.bytes} bytes` : "Header · OSI notional",
      title: f?.name ?? h.label,
      color,
      body: f ? (
        <div className="flex flex-col gap-3">
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              {f.fields.map((fd) => (
                <tr key={fd.name} className="border-b border-outline-variant/50 last:border-0">
                  <td className="py-1.5 pr-2 text-on-surface-variant">{fd.name}</td>
                  <td className="py-1.5 text-right font-mono text-on-surface">{fd.value}</td>
                  <td className="w-10 py-1.5 text-right font-mono text-[11px] text-on-surface-variant/70">
                    {fd.bits ? `${fd.bits}b` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            <span className="font-semibold text-on-surface">Read by: </span>
            {f.readBy}
          </p>
        </div>
      ) : (
        <p>{h.note}</p>
      ),
    };
  };

  const clickLane = (lane: LayerLane, s: Side) => {
    const i = findStep(lane.n, s);
    if (i >= 0) seek(i);
    toggleSelect(layerSelection(lane));
  };

  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 170, damping: 24 };

  return (
    <FitStage padding={28}>
      <div className="relative select-none" style={{ width: W, height: TOWER_H + 150 }}>
        {/* column captions */}
        <div className="absolute inset-x-0 top-0 flex h-8 items-center">
          <Caption text="Sender" on={side === "sender"} width={TOWER_W} align="left" />
          <div className="flex flex-1 justify-center">
            {/* Keyed on the message so a re-run resets the draft. */}
            <MessageEditor key={params.message} />
          </div>
          {hasReceiver ? (
            <Caption text="Receiver" on={side === "receiver"} width={TOWER_W} align="right" />
          ) : (
            <div style={{ width: TOWER_W }} />
          )}
        </div>

        <div className="absolute inset-x-0" style={{ top: 44, height: TOWER_H + 100 }}>
          {/* towers */}
          <Tower
            lanes={lanes}
            rowH={rowH}
            activeN={side === "sender" ? at : null}
            x={0}
            align="left"
            selectedKey={selection?.key}
            onPick={(l) => clickLane(l, "sender")}
          />
          {hasReceiver && (
            <Tower
              lanes={lanes}
              rowH={rowH}
              activeN={side === "receiver" ? at : null}
              x={W - TOWER_W}
              align="right"
              selectedKey={selection?.key}
              onPick={(l) => clickLane(l, "receiver")}
              receiver
              stepSide={side}
            />
          )}

          {/* direction rails */}
          <Rail x={TOWER_W + 18} lit={side === "sender"} dir="down" />
          {hasReceiver && <Rail x={W - TOWER_W - 18} lit={side === "receiver"} dir="up" />}
          {!hasReceiver && <Spotlight lane={lanes[laneIdx]} key={lanes[laneIdx]?.n} />}

          {/* the medium */}
          <Wire on={onWire || at === 1} bits={bits} y={TOWER_H + 34} width={hasReceiver ? W - TOWER_W : TOWER_W / 2 + MID_W} />

          {/* the PDU */}
          <motion.div
            className="absolute flex -translate-y-1/2 items-center justify-center"
            style={{ left: TOWER_W, width: MID_W }}
            initial={false}
            animate={{ top: pduY }}
            transition={spring}
          >
            <div className="flex flex-col items-center gap-2">
              <motion.div layout className="flex items-stretch">
                <AnimatePresence mode="popLayout" initial={false}>
                  {headers.map((h) => (
                    <Segment
                      key={h.id}
                      label={h.label}
                      sub={headerFacts(h.id, params)?.bytes ? `${headerFacts(h.id, params)!.bytes}B` : undefined}
                      color={TONE_HEX[h.tone]}
                      width={widthOf(h)}
                      fresh={h.id === addedId}
                      selected={selection?.key === `header-${h.id}`}
                      onClick={() => toggleSelect(headerSelection(h))}
                      reduce={!!reduce}
                    />
                  ))}
                  <Segment
                    key="payload"
                    label={payload}
                    sub={`${bytes}B`}
                    color={PALETTE.chalk}
                    width={payloadRaw * fit}
                    payload
                    reduce={!!reduce}
                  />
                  {showPad && (
                    <Segment
                      key="pad"
                      label="PAD"
                      sub={`${padding}B`}
                      color={PALETTE.muted}
                      width={padRaw * fit}
                      hatched
                      fresh={step.label === "pad"}
                      reduce={!!reduce}
                    />
                  )}
                  {trailer && (
                    <Segment
                      key={trailer.id}
                      label={trailer.label}
                      sub="4B"
                      color={TONE_HEX[trailer.tone]}
                      width={widthOf(trailer)}
                      fresh={trailer.id === addedId || (step.label === "L2↓" && trailer.id === "FCS")}
                      selected={selection?.key === `header-${trailer.id}`}
                      onClick={() => toggleSelect(headerSelection(trailer))}
                      reduce={!!reduce}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
              <SizeLine step={step} bytes={bytes} padding={padding} params={params} />
            </div>
          </motion.div>

          {/* the header that just left, drifting away */}
          <AnimatePresence>
            {removedId && (
              <motion.span
                key={`${stepIndex}-${removedId}`}
                className="pointer-events-none absolute font-mono text-[14px] font-bold"
                style={{ left: W - TOWER_W - 120, top: pduY - 40, color: PALETTE.muted }}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.9 }}
              >
                {removedId} read &amp; stripped ↑
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </FitStage>
  );
}

// --- pieces ----------------------------------------------------------------

/** The current layer, large — fills the receiver's place on tour lessons. */
function Spotlight({ lane }: { lane?: LayerLane }) {
  if (!lane) return null;
  const fact = LAYER_FACTS[lane.name];
  const color = LANE_HEX[lane.name] ?? PALETTE.chalk;
  return (
    <motion.div
      className="absolute top-0 flex flex-col rounded-xl border p-6"
      style={{ left: W - SPOT_W, width: SPOT_W, height: TOWER_H, borderColor: `${color}66`, background: `${color}0f` }}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[64px] font-bold leading-none" style={{ color }}>
          {lane.n}
        </span>
        <span className="font-hand text-[34px] font-bold leading-tight text-on-surface">{lane.name}</span>
      </div>
      <p className="mt-3 font-sans text-[16px] leading-relaxed text-on-surface">{fact?.job ?? lane.role}</p>
      <div className="mt-4 grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-3">
        <span className="font-label-caps text-[11px] uppercase text-on-surface-variant">Data</span>
        <span className="font-mono text-[15px] font-semibold" style={{ color }}>
          {lane.pduName}
        </span>
        {fact && (
          <>
            <span className="font-label-caps text-[11px] uppercase text-on-surface-variant">Protocols</span>
            <Chips items={fact.protocols.slice(0, 5)} color={color} />
            <span className="font-label-caps text-[11px] uppercase text-on-surface-variant">Devices</span>
            <Chips items={fact.devices} />
          </>
        )}
      </div>
      {fact && (
        <p className="mt-auto rounded-md bg-surface-container-high px-3 py-2.5 font-sans text-[14px] text-on-surface">
          <span className="font-semibold text-note">Remember · </span>
          {fact.remember}
        </p>
      )}
    </motion.div>
  );
}

function Caption({ text, on, width, align }: { text: string; on: boolean; width: number; align: "left" | "right" }) {
  return (
    <div className={`flex items-center gap-2 ${align === "right" ? "justify-end" : ""}`} style={{ width }}>
      <span
        className={`font-label-caps text-label-caps uppercase transition-colors ${on ? "text-primary" : "text-on-surface-variant/60"}`}
      >
        {text}
      </span>
      {on && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />}
    </div>
  );
}

function Tower({
  lanes,
  rowH,
  activeN,
  x,
  align,
  onPick,
  selectedKey,
  receiver,
  stepSide,
}: {
  lanes: LayerLane[];
  rowH: number;
  activeN: number | null;
  x: number;
  align: "left" | "right";
  onPick: (l: LayerLane) => void;
  selectedKey?: string;
  receiver?: boolean;
  stepSide?: LayerStep["side"];
}) {
  return (
    <div className="absolute top-0 flex flex-col gap-1.5" style={{ left: x, width: TOWER_W, height: TOWER_H }}>
      {lanes.map((l) => {
        const color = LANE_HEX[l.name] ?? PALETTE.chalk;
        const active = activeN === l.n;
        // On the receiver's tower, lanes count as done once the PDU has climbed past them.
        const done = receiver
          ? stepSide === "receiver" && activeN !== null && l.n < activeN
          : l.state === "done" || (l.state === "active" && !active);
        const selected = selectedKey === `layer-${l.n}`;
        return (
          <motion.button
            key={l.n}
            type="button"
            onClick={() => onPick(l)}
            whileHover={{ x: align === "left" ? 4 : -4 }}
            whileTap={{ scale: 0.98 }}
            aria-label={`Layer ${l.n}, ${l.name}`}
            className={`relative flex flex-1 items-center gap-3 overflow-hidden rounded-lg border px-3 text-left transition-colors duration-300 ${
              align === "right" ? "flex-row-reverse text-right" : ""
            } ${active ? "bg-surface-container-high" : "bg-surface-container/70 hover:bg-surface-container"}`}
            style={{
              height: rowH - 6,
              borderColor: active || selected ? color : "var(--line)",
              boxShadow: active ? `0 0 0 1px ${color}, 0 0 24px ${color}40` : undefined,
              opacity: active || done || selected ? 1 : 0.72,
            }}
          >
            <span
              className={`absolute inset-y-0 w-1 ${align === "right" ? "right-0" : "left-0"}`}
              style={{ background: color, opacity: active ? 1 : 0.55 }}
            />
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-mono text-[15px] font-bold"
              style={{ background: `${color}22`, color }}
            >
              {l.n}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-hand text-[21px] font-bold leading-tight text-on-surface">
                {l.name}
              </span>
              <span className="block truncate font-mono text-[12px] text-on-surface-variant">{l.pduName}</span>
            </span>
            {done && <span className="font-mono text-[13px] text-on-surface-variant/70">✓</span>}
          </motion.button>
        );
      })}
    </div>
  );
}

function Rail({ x, lit, dir }: { x: number; lit: boolean; dir: "up" | "down" }) {
  return (
    <div className="pointer-events-none absolute top-0 flex flex-col items-center" style={{ left: x - 6, height: TOWER_H }}>
      <div
        className="w-px flex-1 transition-opacity duration-300"
        style={{
          backgroundImage: `linear-gradient(${PALETTE.data} 50%, transparent 50%)`,
          backgroundSize: "1px 10px",
          opacity: lit ? 0.9 : 0.2,
        }}
      />
      <span className="font-mono text-[14px] transition-opacity" style={{ color: PALETTE.data, opacity: lit ? 1 : 0.25 }}>
        {dir === "down" ? "▼" : "▲"}
      </span>
    </div>
  );
}

function Wire({ on, bits, y, width }: { on: boolean; bits?: string; y: number; width: number }) {
  const text = (bits ?? "").replace(/…/g, "").trim() || "0 1 0 0 1 0 0 0";
  return (
    <div
      className="absolute flex items-center overflow-hidden rounded-full"
      style={{ top: y, left: TOWER_W / 2, width, height: 30 }}
    >
      <div
        className="absolute inset-0 rounded-full border transition-colors duration-500"
        style={{
          borderColor: on ? PALETTE.data : "var(--line)",
          background: on ? `${PALETTE.data}14` : "transparent",
          boxShadow: on ? `0 0 18px ${PALETTE.data}40` : undefined,
        }}
      />
      {on ? (
        <div className="flex whitespace-nowrap font-mono text-[13px] tracking-wide" style={{ color: PALETTE.data }}>
          <span className="animate-[bitstream_14s_linear_infinite] pr-8">{text}</span>
          <span className="animate-[bitstream_14s_linear_infinite] pr-8" aria-hidden>
            {text}
          </span>
        </div>
      ) : (
        <span className="w-full text-center font-label-caps text-[12px] uppercase text-on-surface-variant/60">
          the medium
        </span>
      )}
    </div>
  );
}

function Segment({
  label,
  sub,
  color,
  width,
  fresh,
  selected,
  onClick,
  payload,
  hatched,
  reduce,
}: {
  label: string;
  sub?: string;
  color: string;
  width: number;
  fresh?: boolean;
  selected?: boolean;
  onClick?: () => void;
  payload?: boolean;
  hatched?: boolean;
  reduce: boolean;
}) {
  const Tag = onClick ? motion.button : motion.div;
  return (
    <Tag
      layout={!reduce}
      type={onClick ? "button" : undefined}
      onClick={onClick}
      initial={reduce ? false : { opacity: 0, y: -36, scaleY: 0.6 }}
      animate={{ opacity: 1, y: 0, scaleY: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -36 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      whileHover={onClick ? { y: -4 } : undefined}
      title={onClick ? `Inspect ${label}` : undefined}
      className={`relative -ml-px flex h-16 flex-col items-center justify-center overflow-hidden border-2 first:ml-0 first:rounded-l-lg last:rounded-r-lg ${
        onClick ? "cursor-pointer" : ""
      }`}
      style={{
        width,
        borderColor: color,
        background: hatched
          ? `repeating-linear-gradient(135deg, ${color}22 0 6px, transparent 6px 12px)`
          : `${color}${payload ? "1f" : "26"}`,
        boxShadow: selected ? `0 0 0 2px ${color}` : fresh ? `0 0 22px ${color}88` : undefined,
        zIndex: selected ? 2 : 1,
      }}
    >
      <span
        className={`max-w-full truncate px-1 font-mono font-bold ${payload ? "text-[15px]" : "text-[13px]"}`}
        style={{ color: payload ? PALETTE.chalk : color }}
      >
        {label}
      </span>
      {sub && width >= 30 && (
        <span className="font-mono text-[11px] text-on-surface-variant" aria-hidden>
          {sub}
        </span>
      )}
    </Tag>
  );
}

function SizeLine({
  step,
  bytes,
  padding,
  params,
}: {
  step: LayerStep;
  bytes: number;
  padding: number;
  params: { op: string };
}) {
  const hdr = step.headers.reduce((n, h) => n + (headerFacts(h.id, params as never)?.bytes ?? 0), 0);
  const tr = step.trailer ? 4 : 0;
  const pad = step.trailer && padding > 0 && step.label !== "L2↓" ? padding : 0;
  const total = bytes + hdr + tr + pad;
  if (hdr + tr === 0) return <span className="h-5 font-sans text-[13px] text-on-surface-variant">just your {bytes} B</span>;
  return (
    <span className="h-5 font-sans text-[13px] text-on-surface-variant">
      <span className="font-semibold text-on-surface">{bytes} B</span> of yours inside{" "}
      <span className="font-semibold" style={{ color: PALETTE.data }}>
        {total} B
      </span>{" "}
      — {Math.round((bytes / total) * 100)}% payload
    </span>
  );
}

function MessageEditor() {
  const message = useLayerStore((s) => s.params.message);
  const run = useLayerStore((s) => s.run);
  const [draft, setDraft] = useState(message);

  return (
    <form
      className="group flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low/80 py-1 pl-4 pr-1 transition-colors focus-within:border-primary"
      onSubmit={(e) => {
        e.preventDefault();
        run({ message: draft.trim() || "HELLO" });
      }}
    >
      <span className="font-label-caps text-[11px] uppercase text-on-surface-variant">Message</span>
      <input
        value={draft}
        maxLength={40}
        onChange={(e) => setDraft(e.target.value)}
        aria-label="Message to send"
        className="w-44 bg-transparent font-mono text-[15px] text-on-surface outline-none"
      />
      <button
        type="submit"
        className="flex h-7 items-center gap-1 rounded-full bg-primary px-3 font-sans text-[13px] font-bold text-surface"
      >
        Send <Icon name="east" className="text-[14px]" />
      </button>
    </form>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 font-label-caps text-[11px] uppercase text-on-surface-variant/80">{label}</p>
      {children}
    </div>
  );
}

function Chips({ items, color }: { items: string[]; color?: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span
          key={i}
          className="rounded-md px-2 py-0.5 font-mono text-[12px]"
          style={{ background: color ? `${color}1f` : "rgba(243,241,231,0.08)", color: color ?? PALETTE.chalk }}
        >
          {i}
        </span>
      ))}
    </div>
  );
}
