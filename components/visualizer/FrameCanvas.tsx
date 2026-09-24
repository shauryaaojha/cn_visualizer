"use client";

// Header anatomy. Byte-oriented frames (Ethernet, HDLC, PPP) are one strip,
// each field as wide as its size (with a floor so tiny fields stay legible);
// TCP and UDP are drawn RFC-style, 32 bits per row. Fields fill in one per
// frame. Port Numbers adds a host with its listening processes.

import { AnimatePresence, motion } from "framer-motion";
import { FitStage } from "@/components/visualizer/FitStage";
import { factSelection } from "@/components/visualizer/lesson/FactBody";
import { useFrameStore } from "@/lib/frameStore";
import { useLessonUi } from "@/lib/lessonUiStore";
import { PALETTE } from "@/lib/palette";
import type { FrameField, FrameStep, HeaderTone } from "@/types/visualization";

const W = 900;
const TONE: Record<HeaderTone, string> = { signal: PALETTE.data, amber: PALETTE.control, mint: PALETTE.ok, violet: PALETTE.protocol, coral: PALETTE.fail };

function useFieldClick() {
  const toggleSelect = useLessonUi((s) => s.toggleSelect);
  const selected = useLessonUi((s) => s.selection?.key);
  const click = (f: FrameField) =>
    toggleSelect(
      factSelection(`fld-${f.id}`, `Field · ${f.bits % 8 === 0 ? `${f.bits / 8} byte${f.bits === 8 ? "" : "s"}` : `${f.bits} bits`}`, f.name, TONE[f.tone], {
        lead: f.about ?? f.name,
        rows: [
          ["Size", f.bits % 8 === 0 ? `${f.bits / 8} B (${f.bits} bits)` : `${f.bits} bits`],
          ["Value in this run", f.value || "(not filled yet)"],
        ],
      }),
    );
  return { click, selected };
}

export function FrameCanvas() {
  const step = useFrameStore((s) => s.currentStep());
  if (!step) return null;
  return (
    <FitStage>
      <div className="flex flex-col items-center gap-5" style={{ width: W }}>
        {step.demux ? <Demux step={step} /> : step.rowBits ? <RfcRows step={step} /> : <Strip step={step} />}
        {step.stream && <Stream s={step.stream} />}
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

function FieldBox({ f, style, click, selected }: { f: FrameField; style: React.CSSProperties; click: (f: FrameField) => void; selected: boolean }) {
  const c = TONE[f.tone];
  const empty = f.state === "empty";
  return (
    <motion.button
      type="button"
      onClick={() => click(f)}
      initial={false}
      animate={{ opacity: empty ? 0.35 : 1, y: f.state === "new" ? [-10, 0] : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={`flex min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden border-2 px-1 py-1.5 text-center hover:brightness-125 ${selected ? "outline outline-2 outline-offset-2 outline-note" : ""}`}
      style={{ ...style, borderColor: c, borderStyle: empty ? "dashed" : "solid", background: f.state === "new" ? `${c}33` : empty ? "transparent" : `${c}14` }}
    >
      <span className="max-w-full truncate font-mono text-[12px] font-bold" style={{ color: c }}>
        {f.name}
      </span>
      <span className="max-w-full truncate font-mono text-[12px] text-on-surface">{f.value || " "}</span>
    </motion.button>
  );
}

function Strip({ step }: { step: FrameStep }) {
  const { click, selected } = useFieldClick();
  const total = step.fields.reduce((a, f) => a + Math.sqrt(f.bits), 0);
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex h-24 w-full">
        {step.fields.map((f) => (
          <FieldBox key={f.id} f={f} click={click} selected={selected === `fld-${f.id}`} style={{ flexGrow: Math.sqrt(f.bits) / total, flexBasis: 0, minWidth: 70 }} />
        ))}
      </div>
      <div className="flex w-full font-mono text-[12px] text-on-surface-variant">
        {step.fields.map((f) => (
          <span key={f.id} className="truncate text-center" style={{ flexGrow: Math.sqrt(f.bits) / total, flexBasis: 0, minWidth: 70 }}>
            {f.bits % 8 === 0 ? `${f.bits / 8} B` : `${f.bits} b`}
          </span>
        ))}
      </div>
      <p className="text-center font-hand text-[14px] text-on-surface-variant">widths grow with field size (square-root scale, so small fields stay readable)</p>
    </div>
  );
}

function RfcRows({ step }: { step: FrameStep }) {
  const { click, selected } = useFieldClick();
  const per = step.rowBits!;
  // Pack fields into rows of `per` bits; a field wider than a row gets its own full row.
  const rows: { f: FrameField; bits: number }[][] = [[]];
  let used = 0;
  for (const f of step.fields) {
    const bits = Math.min(f.bits, per);
    if (used + bits > per) {
      rows.push([]);
      used = 0;
    }
    rows[rows.length - 1].push({ f, bits });
    used += bits;
  }
  return (
    <div className="flex w-[720px] flex-col">
      <div className="mb-1 flex justify-between font-mono text-[12px] text-on-surface-variant">
        <span>0</span>
        <span>8</span>
        <span>16</span>
        <span>24</span>
        <span>{per - 1}</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="flex h-16 w-full">
          {r.map(({ f, bits }) => (
            <FieldBox key={f.id} f={f} click={click} selected={selected === `fld-${f.id}`} style={{ width: `${(bits / per) * 100}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Stream({ s }: { s: NonNullable<FrameStep["stream"]> }) {
  const marks = new Set(s.marks ?? []);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="font-hand text-[16px] font-bold text-primary">{s.label}</span>
      <div className="flex flex-wrap justify-center gap-0.5">
        {s.bits.split("").map((b, i) => (
          <motion.span
            key={`${s.label}-${i}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.015 }}
            className="flex h-8 w-6 items-center justify-center rounded border font-mono text-[15px] font-bold"
            style={marks.has(i) ? { borderColor: PALETTE.fail, color: PALETTE.fail, background: `${PALETTE.fail}2e` } : { borderColor: `${PALETTE.data}66`, color: PALETTE.data }}
          >
            {b}
          </motion.span>
        ))}
      </div>
      {marks.size > 0 && <span className="font-mono text-[12px] text-coral">pink = stuffed 0 (removed again by the receiver)</span>}
    </div>
  );
}

function Demux({ step }: { step: FrameStep }) {
  const toggleSelect = useLessonUi((s) => s.toggleSelect);
  const d = step.demux!;
  return (
    <div className="flex w-full items-center gap-10">
      <div className="flex w-56 flex-col items-center gap-2">
        <AnimatePresence>
          {d.incoming && (
            <motion.div initial={{ x: -80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="rounded-md border-2 px-3 py-2 font-mono text-[15px] font-bold" style={{ borderColor: PALETTE.data, color: PALETTE.data }}>
              {d.incoming.proto} {d.incoming.label}
            </motion.div>
          )}
        </AnimatePresence>
        <span className="font-mono text-[12px] text-on-surface-variant">to IP 10.0.0.5</span>
      </div>
      <div className="flex-1 rounded-xl border-[1.5px] border-dashed border-outline-variant p-4">
        <p className="mb-3 font-hand text-[18px] font-bold text-primary">Host 10.0.0.5 — transport layer</p>
        <div className="grid grid-cols-1 gap-2">
          {d.apps.map((a) => (
            <motion.button
              type="button"
              key={a.port}
              onClick={() =>
                toggleSelect(
                  factSelection(`app-${a.port}`, `${a.proto} port`, `${a.name} · :${a.port}`, PALETTE.ok, {
                    lead: `${a.name} listens on ${a.proto} port ${a.port}. Every segment addressed to that port is handed to it.`,
                    rows: [["Port", String(a.port)], ["Protocol", a.proto], ["Range", a.port < 1024 ? "well-known" : a.port < 49152 ? "registered" : "ephemeral"]],
                    remember: "Socket = IP address + port. A TCP connection is identified by both ends' sockets.",
                  }),
                )
              }
              initial={false}
              animate={{ scale: a.active ? 1.03 : 1 }}
              className="flex items-center justify-between rounded-md border-2 px-3 py-2 text-left hover:brightness-125"
              style={{ borderColor: a.active ? PALETTE.ok : "var(--line)", background: a.active ? `${PALETTE.ok}22` : "transparent" }}
            >
              <span className="font-sans text-[15px] font-semibold text-on-surface">{a.name}</span>
              <span className="font-mono text-[14px]" style={{ color: a.active ? PALETTE.ok : PALETTE.muted }}>
                {a.proto} :{a.port}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
