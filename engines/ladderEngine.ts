// ---------------------------------------------------------------------------
// ladderEngine — conversations drawn as message-sequence ("ladder") diagrams.
//
// One lane per participant, time running down the page, every message a
// slanted arrow (the slope is the flight time). Flow control is simulated,
// not scripted: stop-and-wait, ARQ and Go-Back-N all run through one small
// discrete-time simulator, so choosing which frame to lose changes what
// actually happens — timers expire, frames are discarded, windows slide.
//
// The Unit 5 protocols are scripted conversations built from the student's
// own inputs: their ISN, their domain name, their file, their keystrokes.
// ---------------------------------------------------------------------------

import type { LadderLane, LadderMark, LadderMsg, LadderProgram, LadderStep, Prediction, StepMessage, WindowStrip } from "@/types/visualization";
import { ask, near } from "./lessonKit.ts";
import type { ControlSet } from "./controls.ts";

export type LadderOp =
  | "stopAndWait"
  | "arq"
  | "slidingWindow"
  | "handshake"
  | "tcpReliability"
  | "tcpFlowControl"
  | "udp"
  | "http"
  | "ftp"
  | "email"
  | "telnet"
  | "dns"
  | "packetJourney";

export interface LadderParams {
  op: LadderOp;
  /** Frames / segments to send. */
  frames: number;
  /** Which data frame's first transmission is lost (1-based, 0 = none). */
  lose: number;
  /** Which frame's ACK is lost (1-based, 0 = none). */
  loseAck: number;
  window: number;
  isn: number;
  mss: number;
  rwnd: number;
  domain: string;
  persistent: "yes" | "no";
  ftpMode: "active" | "passive";
  keys: string;
  cached: "yes" | "no";
}

export const LADDER_DEFAULTS: LadderParams = {
  op: "stopAndWait",
  frames: 4,
  lose: 0,
  loseAck: 0,
  window: 3,
  isn: 1000,
  mss: 500,
  rwnd: 3,
  domain: "www.example.com",
  persistent: "yes",
  ftpMode: "active",
  keys: "ls",
  cached: "no",
};

/** Sensible starting inputs per lesson — a loss where the lesson needs one. */
export const LADDER_OP_DEFAULTS: Partial<Record<LadderOp, Partial<LadderParams>>> = {
  stopAndWait: { frames: 3, lose: 0, loseAck: 0 },
  arq: { frames: 3, lose: 2, loseAck: 0 },
  slidingWindow: { frames: 7, window: 3, lose: 3, loseAck: 0 },
  tcpReliability: { frames: 6, lose: 2 },
  udp: { frames: 4, lose: 2 },
};

const clampInt = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number.isFinite(v) ? v : lo)));

// --- the builder ------------------------------------------------------------

class Ladder {
  msgs: LadderMsg[] = [];
  marks: LadderMark[] = [];
  steps: LadderStep[] = [];
  window?: WindowStrip;
  side?: { title: string; rows: [string, string][] };
  private seen = 0;

  lanes: LadderLane[];
  constructor(lanes: LadderLane[]) {
    this.lanes = lanes;
  }

  msg(
    from: string,
    to: string,
    t0: number,
    t1: number,
    label: string,
    kind: LadderMsg["kind"],
    o: { fields?: [string, string][]; lost?: boolean; channel?: string } = {},
  ): LadderMsg {
    const m: LadderMsg = { id: `m${this.msgs.length}`, from, to, t0, t1, label, kind, state: o.lost ? "lost" : "done", fields: o.fields, channel: o.channel };
    this.msgs.push(m);
    return m;
  }

  mark(lane: string, t: number, kind: LadderMark["kind"], label: string, t1?: number) {
    this.marks.push({ lane, t, kind, label, t1 });
  }

  frame(description: string, label: string, extra: { predict?: Prediction; message?: StepMessage; codeLines?: number[] } = {}) {
    const fresh = new Set(this.msgs.slice(this.seen).map((m) => m.id));
    this.seen = this.msgs.length;
    this.steps.push({
      lanes: this.lanes,
      msgs: this.msgs.map((m) => ({ ...m, fresh: fresh.has(m.id) })),
      marks: [...this.marks],
      tMax: 0,
      window: this.window && { ...this.window },
      side: this.side && { title: this.side.title, rows: this.side.rows.map((r) => [...r] as [string, string]) },
      description,
      label,
      ...extra,
    });
  }

  done(title: string, pseudocode: string[], stats: LadderProgram["stats"]): LadderProgram {
    const tMax = Math.max(6, ...this.msgs.map((m) => m.t1), ...this.marks.map((k) => k.t1 ?? k.t)) + 1;
    this.steps.forEach((s) => (s.tMax = tMax));
    return { steps: this.steps, title, pseudocode, stats };
  }
}

const HOST = (id: string, label: string, sub?: string): LadderLane => ({ id, label, sub, kind: "host" });
const SERVER = (id: string, label: string, sub?: string): LadderLane => ({ id, label, sub, kind: "server" });

// --- flow control: one simulator for stop-and-wait, ARQ and Go-Back-N --------

interface SimOpts {
  total: number;
  N: number;
  /** 1-based frame whose first transmission is lost. */
  loseFrame: number;
  /** 1-based frame whose (first) ACK is lost. */
  loseAck: number;
  /** Sequence numbers shown modulo this (2 for stop-and-wait). */
  mod?: number;
  flight: number;
}

const SW_CODE = [
  "send frame, start timer",
  "wait for its ACK — send nothing else",
  "ACK arrives: next frame (seq flips 0 → 1 → 0 …)",
  "timer expires: resend the same frame",
  "receiver: new seq → deliver + ACK; duplicate → discard + ACK again",
];

const GBN_CODE = [
  "while next < base + N: send frame[next]; next++",
  "start one timer, for the oldest unACKed frame (base)",
  "ACK k arrives: base = k (cumulative), restart timer",
  "timer expires: next = base — resend EVERYTHING from base",
  "receiver: accept only the frame it expects; discard the rest, re-ACK",
];

function slidingSim(L: Ladder, o: SimOpts, gbn: boolean) {
  const lab = (n: number) => (o.mod ? n % o.mod : n);
  const TO = 2 * o.flight + 2;
  let base = 0;
  let next = 0;
  let expected = 0;
  let timerAt: number | null = null;
  let sends = 0;
  let retx = 0;
  const lostOnce = new Set<string>();
  const ackedOnce = new Set<number>();
  const asked = new Set<string>();
  L.window = { label: gbn ? `Sender window (N = ${o.N})` : "Sender", total: o.total, base, next, size: o.N, acked: 0 };

  for (let t = 0; t < 200; t++) {
    const events: string[] = [];
    let label = "";
    let predict: Prediction | undefined;
    let message: StepMessage | undefined;
    let code: number[] = [];

    // 1. data frames arriving at the receiver
    for (const m of L.msgs.filter((x) => x.t1 === t && x.kind === "data" && x.state === "done")) {
      const seq = Number((m.fields?.find((f) => f[0] === "frame #") ?? ["", "0"])[1]);
      if (seq === expected) {
        expected++;
        L.mark("rx", t, "deliver", `F${seq} ✓`);
        const lost = expected === o.loseAck && !ackedOnce.has(expected);
        ackedOnce.add(expected);
        L.msg("rx", "tx", t, t + o.flight, `ACK ${lab(expected)}`, "ack", { lost, fields: [["ACK (next expected)", String(lab(expected))], ["frame #", String(expected)]] });
        events.push(`The receiver gets F${lab(seq)}, delivers it and replies ACK ${lab(expected)} — "send me ${lab(expected)} next".${lost ? " That ACK is lost on the way back." : ""}`);
        label = label || `F${lab(seq)} ✓`;
        code = gbn ? [5] : [5];
        if (!asked.has("firstAck")) {
          asked.add("firstAck");
          predict = ask(
            `The receiver has just received F${lab(seq)}. Which ACK does it send back?`,
            `ACK ${lab(expected)}`,
            [`ACK ${lab(seq)}`, `ACK ${lab(expected + 1)}`, "No ACK — it waits for more"],
            "ACKs name the frame the receiver expects NEXT, not the one it just got.",
            seq + 1,
          );
        }
      } else {
        const dup = seq < expected;
        L.mark("rx", t, "drop", dup ? `dup F${lab(seq)}` : `F${lab(seq)} ✕`);
        L.msg("rx", "tx", t, t + o.flight, `ACK ${lab(expected)}`, "ack", { fields: [["ACK (next expected)", String(lab(expected))], ["frame #", String(expected)]] });
        events.push(
          dup
            ? `F${lab(seq)} arrives again — a duplicate, because its ACK was lost. The receiver discards it but ACKs again (ACK ${lab(expected)}), or the sender would resend forever.`
            : `F${lab(seq)} arrives, but the receiver is still waiting for F${lab(expected)}. Go-Back-N receivers keep no buffer: it is discarded, and ACK ${lab(expected)} goes back again.`,
        );
        label = label || (dup ? "dup" : `F${lab(seq)} ✕`);
        code = [5];
        if (dup && !asked.has("dup")) {
          asked.add("dup");
          predict = ask(
            `F${lab(seq)} arrives a second time. The receiver already delivered it. What does it do?`,
            "Discard it, and send the ACK again",
            ["Deliver it again", "Discard it silently", "Ask for the next frame to be resent"],
            "The duplicate exists because the ACK was lost — so the ACK must be repeated, or the sender will keep retrying.",
            2,
          );
        }
        if (!dup && !asked.has("ooo")) {
          asked.add("ooo");
          predict = ask(
            `F${lab(seq)} arrives but F${lab(expected)} never did. What does a Go-Back-N receiver do with F${lab(seq)}?`,
            `Discard it and ACK ${lab(expected)} again`,
            [`Buffer it until F${lab(expected)} arrives`, `Deliver it and ACK ${lab(seq + 1)}`, "Send a NAK for every missing frame"],
            "Go-Back-N receivers only accept frames in order; the sender will resend everything from the gap. (Selective Repeat would buffer it.)",
            1,
          );
        }
      }
    }

    // 2. ACKs arriving at the sender
    for (const m of L.msgs.filter((x) => x.t1 === t && x.kind === "ack" && x.state === "done")) {
      const a = Number((m.fields?.find((f) => f[0] === "frame #") ?? ["", "0"])[1]);
      if (a > base) {
        base = a;
        timerAt = base < next ? t : null;
        events.push(
          gbn
            ? `ACK ${a} reaches the sender: everything up to F${a - 1} is confirmed. The window slides to start at F${a}.`
            : `ACK ${lab(a)} reaches the sender: F${lab(a - 1)} is confirmed${a < o.total ? ", so it may send the next frame" : ""}.`,
        );
        label = label || `ACK ${lab(a)}`;
        code = gbn ? [3] : [3];
      } else {
        events.push(`A duplicate ACK ${lab(a)} arrives — nothing new is confirmed.`);
        label = label || "dup ACK";
      }
    }

    // 3. timeout
    if (timerAt !== null && t >= timerAt + TO && base < next) {
      L.mark("tx", t, "timeout", `timeout F${lab(base)}`);
      const resend = next - base;
      events.push(
        gbn
          ? `The timer for F${lab(base)} expires. Go-Back-N goes back: it resends F${lab(base)} and everything after it that was already sent (${resend} frame${resend === 1 ? "" : "s"}).`
          : `No ACK for F${lab(base)} before the timer ran out. The sender assumes it was lost and resends the same frame.`,
      );
      label = `⏰ F${lab(base)}`;
      code = [4];
      message = { text: `Timeout — resending from F${lab(base)}`, tone: "warn" };
      if (!asked.has("timeout")) {
        asked.add("timeout");
        predict = ask(
          `The timer for F${lab(base)} has expired with no ACK. What does the sender do now?`,
          gbn && resend > 1 ? `Resend F${lab(base)} to F${lab(next - 1)}` : `Resend F${lab(base)}`,
          gbn && resend > 1
            ? [`Resend only F${lab(base)}`, `Send F${lab(next)} and carry on`, "Wait for the receiver to ask"]
            : [`Send F${lab(base + 1)} and carry on`, "Wait for the receiver to ask", "Give up on the transfer"],
          gbn ? "Go-Back-N keeps one timer and resends the whole outstanding window." : "Stop-and-wait resends the one frame it is waiting on — same sequence number.",
          t,
        );
      }
      next = base;
      retx += resend;
      timerAt = null;
    }

    // 4. send while the window allows (one per tick)
    if (next < base + o.N && next < o.total) {
      const f = next;
      const key = `F${f}`;
      const lost = f + 1 === o.loseFrame && !lostOnce.has(key);
      if (lost) lostOnce.add(key);
      const again = L.msgs.some((m) => m.kind === "data" && m.fields?.[0]?.[1] === String(f));
      L.msg("tx", "rx", t, t + o.flight, `F${lab(f)}`, "data", { lost, fields: [["frame #", String(f)], ["seq", String(lab(f))], ["payload", `${100} B`], ["transmission", again ? "retransmission" : "first"]] });
      if (timerAt === null) {
        timerAt = t;
      }
      if (!gbn || f === base) L.mark("tx", t, "timer", `timer F${lab(base)}`, t + TO);
      sends++;
      next++;
      events.push(
        `${again ? "Retransmits" : "Sends"} F${lab(f)}${o.mod ? ` (seq ${lab(f)})` : ""}.${lost ? " It is lost on the wire — the receiver will never see it." : ""}${gbn && next < base + o.N && next < o.total ? " The window still has room." : ""}`,
      );
      label = label || `F${lab(f)} →`;
      code = code.length ? code : [1, 2];
      if (o.mod && f === 2 && !again && !asked.has("seq")) {
        asked.add("seq");
        predict =
          predict ??
          ask(
            "Stop-and-wait numbers its frames with a single bit. What sequence number does the third frame carry?",
            "0",
            ["1", "2", "3"],
            "One bit is enough when only one frame is ever outstanding: 0, 1, 0, 1… — just enough to tell a new frame from a duplicate.",
            1,
          );
      }
      if (gbn && f === o.N - 1 && !asked.has("window") && o.N > 1) {
        asked.add("window");
        predict =
          predict ??
          ask(
            `Window size N = ${o.N}. How many frames can the sender have in flight before the first ACK returns?`,
            String(o.N),
            ["1", String(o.N + 1), String(o.N * 2)],
            "That is exactly what the window is: N frames may be sent and unacknowledged at once.",
            o.N,
          );
      }
    }

    if (L.window) L.window = { ...L.window, base, next, acked: base };
    if (events.length) L.frame(events.join(" "), label, { predict, message, codeLines: code });
    const inFlight = L.msgs.some((m) => m.t1 > t && m.state === "done");
    if (base >= o.total && !inFlight) break;
  }
  return { sends, retx };
}

function flowControl(p: LadderParams, kind: "sw" | "arq" | "gbn"): LadderProgram {
  const total = clampInt(p.frames, 1, kind === "gbn" ? 10 : 6);
  const N = kind === "gbn" ? clampInt(p.window, 1, 6) : 1;
  const loseFrame = kind === "sw" ? 0 : clampInt(p.lose, 0, total);
  const loseAck = kind === "sw" ? 0 : clampInt(p.loseAck, 0, total);
  const L = new Ladder([HOST("tx", "Sender"), HOST("rx", "Receiver")]);
  L.frame(
    kind === "gbn"
      ? `${total} frames to send with a window of ${N}: up to ${N} frames may be on the wire before any ACK comes back.${loseFrame ? ` Frame F${loseFrame - 1} will be lost.` : ""}`
      : `${total} frames to send, one at a time. The sender may not send the next frame until the previous one is acknowledged.${loseFrame ? ` F${(loseFrame - 1) % 2} (frame ${loseFrame}) will be lost on the wire.` : ""}${loseAck ? ` The ACK for frame ${loseAck} will be lost.` : ""}`,
    "ready",
    { codeLines: [1] },
  );
  const { sends, retx } = slidingSim(L, { total, N, loseFrame, loseAck, mod: kind === "gbn" ? undefined : 2, flight: 3 }, kind === "gbn");
  const last = L.steps[L.steps.length - 1];
  last.message = { text: `All ${total} frames delivered — ${sends} transmissions${retx ? `, ${retx} of them repeats` : ""}`, tone: "ok" };
  last.label = "done";
  const time = Math.max(...L.msgs.map((m) => m.t1));
  const name = kind === "gbn" ? `Go-Back-N (N = ${N})` : kind === "arq" ? "Stop-and-Wait ARQ" : "Stop-and-Wait";
  return L.done(`${name} — ${total} frames`, kind === "gbn" ? GBN_CODE : SW_CODE, [
    { label: "Frames", value: String(total), tone: "signal" },
    { label: "Transmissions", value: String(sends), tone: retx ? "amber" : "mint" },
    { label: "Resent", value: String(retx), tone: retx ? "coral" : "mint" },
    { label: "Time", value: `${time} ticks`, tone: "signal" },
    { label: "Useful share", value: `${Math.round((total / sends) * 100)}%`, tone: "mint" },
  ]);
}

// --- TCP three-way handshake (and close) ------------------------------------

const HS_CODE = [
  "client → SYN,      seq = x",
  "server → SYN+ACK,  seq = y,   ack = x + 1",
  "client → ACK,      seq = x+1, ack = y + 1     — ESTABLISHED",
  "data flows, each side numbering its own bytes",
  "FIN, ACK in each direction to close",
];

function handshake(p: LadderParams): LadderProgram {
  const x = clampInt(p.isn, 0, 4_000_000_000);
  const y = 5000;
  const L = new Ladder([HOST("c", "Client", "10.0.0.5 : 51000"), SERVER("s", "Server", "93.184.216.34 : 80")]);
  L.side = { title: "Connection state", rows: [["Client", "CLOSED"], ["Server", "LISTEN"]] };
  const st = (c: string, s: string) => (L.side!.rows = [["Client", c], ["Server", s]]);
  L.frame(`The server is listening on port 80. The client picks a random starting sequence number, x = ${x}.`, "listen", { codeLines: [1] });
  L.msg("c", "s", 0, 3, "SYN", "control", { fields: [["Flags", "SYN"], ["seq", String(x)], ["ack", "—"], ["Src port", "51000"], ["Dst port", "80"]] });
  st("SYN_SENT", "SYN_RCVD");
  L.frame(`Client → SYN, seq = ${x}. "I want to talk, and my bytes will be numbered from ${x}." A SYN carries no data but uses up one sequence number.`, "SYN", { codeLines: [1] });
  L.msg("s", "c", 3, 6, "SYN-ACK", "control", { fields: [["Flags", "SYN, ACK"], ["seq", String(y)], ["ack", String(x + 1)]] });
  L.frame(`Server → SYN-ACK, seq = ${y}, ack = ${x + 1}. It acknowledges the client's SYN and sends its own starting number.`, "SYN-ACK", {
    codeLines: [2],
    predict: ask(
      `The client's SYN had seq = ${x}. What ack number does the server's SYN-ACK carry?`,
      String(x + 1),
      [String(x), String(y), String(y + 1)],
      "ack = the next sequence number the server expects. The SYN itself counts as one, so it is x + 1.",
      x,
    ),
  });
  L.msg("c", "s", 6, 9, "ACK", "control", { fields: [["Flags", "ACK"], ["seq", String(x + 1)], ["ack", String(y + 1)]] });
  st("ESTABLISHED", "ESTABLISHED");
  L.frame(`Client → ACK, ack = ${y + 1}. Three messages, and both sides now know each other's starting numbers. The connection is ESTABLISHED.`, "ACK", {
    codeLines: [3],
    message: { text: "ESTABLISHED — after 1.5 round trips", tone: "ok" },
    predict: ask(
      `The server's SYN-ACK had seq = ${y}. What ack does the client send?`,
      String(y + 1),
      [String(y), String(x + 1), String(x + 2)],
      "Same rule in the other direction: acknowledge the SYN by expecting y + 1.",
      y,
    ),
  });
  L.msg("c", "s", 9, 12, "GET / (100 B)", "data", { fields: [["Flags", "ACK, PSH"], ["seq", String(x + 1)], ["ack", String(y + 1)], ["data", "100 bytes"]] });
  L.msg("s", "c", 12, 15, "ACK", "ack", { fields: [["Flags", "ACK"], ["seq", String(y + 1)], ["ack", String(x + 101)]] });
  L.frame(`Data flows. The client sends 100 bytes starting at seq ${x + 1}; the server acknowledges with ack = ${x + 101}.`, "data", {
    codeLines: [4],
    predict: ask(
      `The client sends 100 bytes with seq = ${x + 1}. What ack comes back?`,
      String(x + 101),
      [String(x + 2), String(x + 100), String(x + 1)],
      "TCP numbers bytes, not segments: the next byte expected is seq + length.",
      2,
    ),
  });
  L.msg("c", "s", 15, 18, "FIN", "control", { fields: [["Flags", "FIN, ACK"], ["seq", String(x + 101)]] });
  L.msg("s", "c", 18, 21, "ACK", "control", { fields: [["Flags", "ACK"], ["ack", String(x + 102)]] });
  st("FIN_WAIT_2", "CLOSE_WAIT");
  L.frame("The client is done: FIN. The server ACKs it — the client→server direction is now closed, but the server may still send.", "FIN", { codeLines: [5] });
  L.msg("s", "c", 21, 24, "FIN", "control", { fields: [["Flags", "FIN, ACK"], ["seq", String(y + 1)]] });
  L.msg("c", "s", 24, 27, "ACK", "control", { fields: [["Flags", "ACK"], ["ack", String(y + 2)]] });
  L.mark("c", 27, "timer", "TIME_WAIT", 30);
  st("TIME_WAIT", "CLOSED");
  L.frame("The server closes its direction too: FIN, ACK. Four messages to close, because each direction is closed on its own. The client waits in TIME_WAIT in case the last ACK was lost.", "close", {
    codeLines: [5],
    message: { text: "Closed — 3 messages to open, 4 to close", tone: "ok" },
    predict: ask(
      "How many messages does a normal TCP close take?",
      "4",
      ["2", "3", "1"],
      "FIN + ACK for each direction. (The middle two can sometimes be combined into one, making 3.)",
      3,
    ),
  });
  return L.done(`TCP Three-Way Handshake — ISN ${x}`, HS_CODE, [
    { label: "Client ISN", value: String(x), tone: "signal" },
    { label: "Server ISN", value: String(y), tone: "signal" },
    { label: "Open", value: "3 messages · 1.5 RTT", tone: "mint" },
    { label: "Close", value: "4 messages", tone: "amber" },
  ]);
}

// --- TCP reliability: loss, duplicate ACKs, fast retransmit -----------------

const REL_CODE = [
  "send segments; each ACK = next byte expected (cumulative)",
  "a gap at the receiver → it repeats the same ACK (duplicate ACK)",
  "3 duplicate ACKs → fast retransmit the missing segment",
  "(or the retransmission timer expires first)",
  "gap filled → one ACK covers everything received",
];

function tcpReliability(p: LadderParams): LadderProgram {
  const n = clampInt(p.frames, 3, 8);
  const mss = clampInt(p.mss, 100, 1460);
  const lose = clampInt(p.lose, 0, n);
  const x = clampInt(p.isn, 0, 4_000_000_000) + 1;
  const L = new Ladder([HOST("c", "Sender"), SERVER("s", "Receiver")]);
  const seq = (i: number) => x + i * mss;
  L.side = { title: "Receiver", rows: [["Next expected", String(x)], ["Buffered out of order", "—"]] };
  L.frame(`${n} segments of ${mss} bytes, numbered by byte: the first starts at seq ${x}.${lose ? ` Segment ${lose} (seq ${seq(lose - 1)}) will be lost.` : ""}`, "ready", { codeLines: [1] });
  let expected = x;
  const buffered: number[] = [];
  let dup = 0;
  let asked = false;
  for (let i = 0; i < n; i++) {
    const lost = i + 1 === lose;
    L.msg("c", "s", i, i + 3, `seq ${seq(i)}`, "data", { lost, fields: [["seq", String(seq(i))], ["length", `${mss} B`], ["bytes", `${seq(i)}–${seq(i) + mss - 1}`]] });
    if (lost) {
      L.frame(`Segment ${i + 1} (seq ${seq(i)}) is lost in the network.`, "lost", { codeLines: [1] });
      continue;
    }
    if (seq(i) === expected) expected = seq(i) + mss;
    else buffered.push(seq(i));
    const isDup = lose > 0 && i + 1 > lose;
    if (isDup) dup++;
    L.msg("s", "c", i + 3, i + 6, `ACK ${expected}`, "ack", { fields: [["ack", String(expected)], ["meaning", `send me byte ${expected} next`], ...(isDup ? ([["duplicate", `#${dup}`]] as [string, string][]) : [])] });
    L.side = { title: "Receiver", rows: [["Next expected", String(expected)], ["Buffered out of order", buffered.length ? buffered.join(", ") : "—"]] };
    L.frame(
      isDup
        ? `seq ${seq(i)} arrives, but byte ${expected} is still missing. The receiver buffers it and repeats ACK ${expected} — duplicate ACK #${dup}.`
        : `seq ${seq(i)} arrives in order. ACK ${expected}: "everything before byte ${expected} is here".`,
      isDup ? `dup ${dup}` : `ACK ${expected}`,
      {
        codeLines: isDup ? [2] : [1],
        predict:
          isDup && !asked
            ? ((asked = true),
              ask(
                `Segment seq ${seq(lose - 1)} never arrived. Now seq ${seq(i)} does. Which ACK does the receiver send?`,
                `ACK ${expected}`,
                [`ACK ${seq(i) + mss}`, `ACK ${seq(i)}`, "No ACK until the gap is filled"],
                "ACKs are cumulative: they can only say how far the data is complete, so the receiver repeats the ACK for the missing byte.",
                i,
              ))
            : undefined,
      },
    );
  }
  if (lose) {
    // Fast retransmit fires when the third duplicate ACK lands; otherwise the timer does.
    const t = dup >= 3 ? lose + 8 : Math.max(n + 6, lose + 9);
    const missing = seq(lose - 1);
    const all = seq(n - 1) + mss;
    L.mark("c", t, "note", dup >= 3 ? "3 dup ACKs" : "timeout");
    L.msg("c", "s", t, t + 3, `seq ${missing} again`, "data", { fields: [["seq", String(missing)], ["length", `${mss} B`], ["transmission", dup >= 3 ? "fast retransmit" : "after timeout"]] });
    L.frame(
      dup >= 3
        ? `Three duplicate ACKs for ${missing}: the sender does not wait for its timer — it fast-retransmits seq ${missing} straight away.`
        : `Fewer than 3 duplicate ACKs came back, so the sender waits for its retransmission timer, then resends seq ${missing}.`,
      dup >= 3 ? "fast rtx" : "⏰ rtx",
      {
        codeLines: dup >= 3 ? [3] : [4],
        message: { text: dup >= 3 ? "Fast retransmit after 3 duplicate ACKs" : "Retransmission timeout", tone: "warn" },
        predict: ask(
          `The sender has received ${dup} duplicate ACK${dup === 1 ? "" : "s"} for ${missing}. What does it do?`,
          dup >= 3 ? `Resend seq ${missing} now (fast retransmit)` : `Wait for the timer, then resend seq ${missing}`,
          [`Resend seq ${missing} now (fast retransmit)`, `Wait for the timer, then resend seq ${missing}`, "Resend every segment from the start", "Nothing — the receiver will cope"],
          "Three duplicate ACKs are strong evidence of a single loss, so TCP retransmits immediately; fewer than that and it waits for the timeout.",
          0,
        ),
      },
    );
    L.msg("s", "c", t + 3, t + 6, `ACK ${all}`, "ack", { fields: [["ack", String(all)], ["meaning", "everything is here"]] });
    L.side = { title: "Receiver", rows: [["Next expected", String(all)], ["Buffered out of order", "—"]] };
    L.frame(`The gap is filled. The receiver already held the later segments, so one ACK — ${all} — confirms all ${n} at once.`, "ACK all", {
      codeLines: [5],
      message: { text: `Recovered — one retransmission, ACK ${all} covers everything`, tone: "ok" },
      predict: ask(
        `seq ${missing} finally arrives. The later segments were buffered. Which ACK now?`,
        `ACK ${all}`,
        [`ACK ${missing + mss}`, `ACK ${missing}`, `ACK ${all - mss}`],
        "Cumulative ACK: the receiver acknowledges everything that is now contiguous.",
        n,
      ),
    });
  } else {
    L.steps[L.steps.length - 1].message = { text: `All ${n} segments acknowledged, nothing lost`, tone: "ok" };
  }
  return L.done(`TCP Reliability — ${n} × ${mss} B`, REL_CODE, [
    { label: "Segments", value: String(n), tone: "signal" },
    { label: "MSS", value: `${mss} B`, tone: "signal" },
    { label: "Duplicate ACKs", value: String(dup), tone: dup ? "amber" : "mint" },
    { label: "Retransmitted", value: lose ? "1" : "0", tone: lose ? "coral" : "mint" },
  ]);
}

// --- TCP flow control: the receive window -----------------------------------

const FC_CODE = [
  "receiver advertises rwnd = free space in its buffer",
  "sender keeps (bytes in flight) ≤ rwnd",
  "the app reads slowly → the buffer fills → rwnd shrinks",
  "rwnd = 0 → sender stops, sends 1-byte window probes",
  "app reads → window update → sending resumes",
];

function tcpFlowControl(p: LadderParams): LadderProgram {
  const B = clampInt(p.rwnd, 2, 6); // buffer in segments
  const mss = clampInt(p.mss, 100, 1460);
  const L = new Ladder([HOST("c", "Sender"), SERVER("s", "Receiver", `buffer ${B} × ${mss} B`)]);
  let buf = 0;
  const side = () => (L.side = { title: "Receiver buffer", rows: [["Buffer", `${buf} / ${B} segments full`], ["rwnd", `${(B - buf) * mss} B`]] });
  side();
  L.frame(`The receiver has room for ${B} segments (${B * mss} bytes), so it advertises rwnd = ${B * mss}. Its application, though, is slow to read.`, "rwnd", { codeLines: [1] });
  let t = 0;
  for (let i = 0; i < B; i++) L.msg("c", "s", t + i, t + i + 3, `seg ${i + 1}`, "data", { fields: [["length", `${mss} B`]] });
  L.frame(`The sender may have ${B * mss} bytes unacknowledged, so it sends ${B} segments back to back.`, "burst", {
    codeLines: [2],
    predict: ask(
      `rwnd = ${B * mss} bytes and each segment is ${mss} bytes. How many segments can the sender send before waiting?`,
      String(B),
      near(B, [-1, 1, 3]),
      "Bytes in flight must stay within the advertised window: rwnd ÷ MSS segments.",
      B,
    ),
  });
  t += B + 2;
  buf = B;
  side();
  L.msg("s", "c", t, t + 3, "ACK · rwnd 0", "ack", { fields: [["ack", `all ${B} segments`], ["rwnd", "0"]] });
  L.mark("s", t, "buffer", "buffer full");
  L.frame("All the data arrived, but the application has not read any of it. The buffer is full, so the ACK advertises rwnd = 0.", "rwnd 0", { codeLines: [3], message: { text: "rwnd = 0 — the receiver is full", tone: "warn" } });
  t += 3;
  L.mark("c", t, "timer", "persist timer", t + 4);
  L.msg("c", "s", t + 4, t + 7, "probe (1 B)", "control", { fields: [["length", "1 B"], ["why", "is there room yet?"]] });
  L.msg("s", "c", t + 7, t + 10, "ACK · rwnd 0", "ack", { fields: [["rwnd", "0"]] });
  L.frame("The sender must stop — but if it just waited, a lost window update would deadlock both sides. So a persist timer fires and it sends a 1-byte window probe. Still 0.", "probe", {
    codeLines: [4],
    predict: ask(
      "The receiver advertised rwnd = 0. What does the sender do?",
      "Stop, and send small window probes",
      ["Keep sending at full speed", "Close the connection", "Halve its sending rate"],
      "rwnd is a hard limit. The probes stop a lost window update from freezing the connection forever.",
      1,
    ),
  });
  t += 10;
  const read = Math.max(1, Math.floor(B / 2));
  buf = B - read;
  side();
  L.mark("s", t, "deliver", `app reads ${read}`);
  L.msg("s", "c", t + 1, t + 4, `update · rwnd ${read * mss}`, "ack", { fields: [["rwnd", `${read * mss}`], ["why", `app read ${read} segment(s)`]] });
  L.frame(`The application finally reads ${read} segment${read === 1 ? "" : "s"}, freeing ${read * mss} bytes. The receiver sends a window update: rwnd = ${read * mss}.`, "update", { codeLines: [5] });
  t += 4;
  for (let i = 0; i < read; i++) L.msg("c", "s", t + i, t + i + 3, `seg ${B + i + 1}`, "data", { fields: [["length", `${mss} B`]] });
  buf = B;
  side();
  L.frame(`Sending resumes — exactly ${read} segment${read === 1 ? "" : "s"}, because that is all the window allows. The receiver, not the network, set the pace.`, "resume", {
    codeLines: [2, 5],
    message: { text: "Flow control: the slow reader throttled the fast sender", tone: "ok" },
    predict: ask(
      `The window update says rwnd = ${read * mss}. How many ${mss}-byte segments can go now?`,
      String(read),
      near(read, [1, 2, -1]).concat([String(B)]),
      "Again rwnd ÷ MSS — the window opened only as far as the app freed space.",
      read + 1,
    ),
  });
  return L.done(`TCP Flow Control — ${B}-segment buffer`, FC_CODE, [
    { label: "Buffer", value: `${B * mss} B`, tone: "signal" },
    { label: "MSS", value: `${mss} B`, tone: "signal" },
    { label: "Stalled", value: "rwnd = 0", tone: "coral" },
    { label: "Resumed with", value: `${read * mss} B`, tone: "mint" },
  ]);
}

// --- UDP ----------------------------------------------------------------------

function udp(p: LadderParams): LadderProgram {
  const n = clampInt(p.frames, 2, 8);
  const lose = clampInt(p.lose, 0, n);
  const L = new Ladder([HOST("c", "Client", "port 53000"), SERVER("s", "Server", "port 53 (DNS)")]);
  L.frame(`UDP: no connection, no handshake. The client simply sends ${n} datagrams.${lose ? ` Datagram ${lose} will be lost.` : ""}`, "ready", {
    codeLines: [1],
  });
  for (let i = 0; i < n; i++) {
    const lost = i + 1 === lose;
    L.msg("c", "s", i * 2, i * 2 + 3, `datagram ${i + 1}`, "data", { lost, fields: [["Src port", "53000"], ["Dst port", "53"], ["Length", "8 + 40 B"], ["Checksum", "optional in IPv4"]] });
    if (lost)
      L.frame(`Datagram ${i + 1} is lost. Nobody notices: there are no sequence numbers and no ACKs.`, "lost", {
        codeLines: [3],
        message: { text: `Datagram ${i + 1} lost — and never resent`, tone: "error" },
        predict: ask(
          `Datagram ${i + 1} is lost in the network. What does UDP do about it?`,
          "Nothing — it is simply gone",
          ["Resends it after a timeout", "The receiver sends a NAK", "Resends it after 3 duplicate ACKs"],
          "UDP has no acknowledgements and no retransmission. If the application cares, the application must notice and ask again.",
          0,
        ),
      });
    else L.frame(`Datagram ${i + 1} arrives and goes straight to the process on port 53. No reply needed.`, `dg ${i + 1}`, { codeLines: [2] });
  }
  L.steps[0].predict = undefined;
  if (L.steps[1])
    L.steps[1].predict = L.steps[1].predict ?? ask(
      "Before the first datagram, how many setup messages does UDP exchange?",
      "0",
      ["1", "3", "4"],
      "UDP is connectionless: the first packet already carries data. That is why DNS and games use it.",
      0,
    );
  return L.done(`UDP — ${n} datagrams`, ["no connection setup", "each datagram: 8-byte header + data, sent on its own", "no ACKs, no retransmission, no ordering", "the application decides whether loss matters"], [
    { label: "Header", value: "8 bytes", tone: "signal" },
    { label: "Setup", value: "none", tone: "mint" },
    { label: "Delivered", value: `${n - (lose ? 1 : 0)} / ${n}`, tone: lose ? "coral" : "mint" },
  ]);
}

// --- HTTP ---------------------------------------------------------------------

function http(p: LadderParams): LadderProgram {
  const persistent = p.persistent === "yes";
  const objs = 2;
  const L = new Ladder([HOST("c", "Browser"), SERVER("s", "Web server", "port 80")]);
  let t = 0;
  let rtt = 0;
  const hs = (label: string) => {
    L.msg("c", "s", t, t + 2, "SYN", "control", { fields: [["Flags", "SYN"]] });
    L.msg("s", "c", t + 2, t + 4, "SYN-ACK", "control", { fields: [["Flags", "SYN, ACK"]] });
    L.frame(`${label}: the browser opens a TCP connection to port 80 — SYN, SYN-ACK. One round trip before any HTTP.`, "TCP", {});
    t += 4;
    rtt++;
  };
  const req = (path: string, i: number, pred?: Prediction) => {
    L.msg("c", "s", t, t + 2, `GET ${path}`, "query", {
      fields: [["Request line", `GET ${path} HTTP/1.1`], ["Host", p.domain], ["Connection", persistent ? "keep-alive" : "close"]],
    });
    L.msg("s", "c", t + 2, t + 5, "200 OK", "reply", { fields: [["Status", "HTTP/1.1 200 OK"], ["Content-Type", i === 0 ? "text/html" : "image/png"], ["Content-Length", i === 0 ? "5120" : "20480"]] });
    L.frame(
      `GET ${path} (riding on the handshake's final ACK), and the server answers 200 OK with the ${i === 0 ? "HTML page" : "image"}.`,
      i === 0 ? "page" : "image",
      { predict: pred },
    );
    t += 5;
    rtt++;
  };
  L.frame(`Load http://${p.domain}/ — a page with one image. ${persistent ? "Persistent HTTP: both objects share one TCP connection." : "Non-persistent HTTP: every object gets its own TCP connection."}`, "ready");
  hs("Object 1");
  req("/index.html", 0, ask(
    "From clicking the link to the first byte of the page arriving, how many round-trip times?",
    "2 RTT",
    ["1 RTT", "3 RTT", "0.5 RTT"],
    "One RTT to set up TCP, one RTT for the request and response.",
    1,
  ));
  if (!persistent) {
    L.msg("s", "c", t, t + 2, "FIN", "control", {});
    L.frame("Connection: close — the server tears the connection down after one object.", "close");
    t += 2;
    hs("Object 2");
  }
  req("/logo.png", 1, ask(
    persistent ? "The image is requested on the same connection. How many more RTTs?" : "The image needs a brand-new connection. How many more RTTs?",
    persistent ? "1 RTT" : "2 RTT",
    ["1 RTT", "2 RTT", "3 RTT"],
    persistent ? "No new handshake: just the request and response." : "Handshake again, then request and response.",
    persistent ? 0 : 1,
  ));
  L.steps[L.steps.length - 1].message = { text: `${objs} objects in ${rtt} RTTs (${persistent ? "persistent" : "non-persistent"})`, tone: "ok" };
  return L.done(`HTTP — ${persistent ? "persistent" : "non-persistent"}`, ["open TCP to port 80", "send request: method, path, headers", "server replies: status line, headers, body", "persistent: reuse the connection · non-persistent: close and reopen"], [
    { label: "Objects", value: String(objs), tone: "signal" },
    { label: "RTTs", value: String(rtt), tone: persistent ? "mint" : "amber" },
    { label: "Connections", value: persistent ? "1" : "2", tone: "signal" },
  ]);
}

// --- FTP ----------------------------------------------------------------------

function ftp(p: LadderParams): LadderProgram {
  const active = p.ftpMode === "active";
  const L = new Ladder([HOST("c", "Client"), SERVER("s21", "Server", "control · port 21"), SERVER("s20", "Server", active ? "data · port 20" : "data · port 50100")]);
  let t = 0;
  const say = (from: string, to: string, label: string, fields: [string, string][], kind: LadderMsg["kind"] = "control", channel = "control") => {
    L.msg(from, to, t, t + 2, label, kind, { fields, channel });
    t += 2;
  };
  L.frame("FTP uses two TCP connections: a control connection that stays open for the whole session, and a separate data connection for each file.", "ready");
  say("c", "s21", "USER devesh", [["Command", "USER devesh"]]);
  say("s21", "c", "331 need password", [["Reply", "331"]]);
  say("c", "s21", "PASS ••••", [["Command", "PASS"], ["Sent as", "plain text!"]]);
  say("s21", "c", "230 logged in", [["Reply", "230"]]);
  L.frame("Log in over the control connection (port 21). Commands and replies are plain text — including the password.", "login", {
    predict: ask(
      "Which port carries FTP's commands — USER, PASS, RETR?",
      "21",
      ["20", "80", "23"],
      "Port 21 is the control connection; it stays open for the whole session.",
      0,
    ),
  });
  say("c", "s21", active ? "PORT 10,0,0,5,200,10" : "PASV", [["Command", active ? "PORT (client listens on 51210)" : "PASV"]]);
  if (!active) say("s21", "c", "227 port 50100", [["Reply", "227 Entering Passive Mode"]]);
  say("c", "s21", "RETR notes.pdf", [["Command", "RETR notes.pdf"]]);
  L.frame(active ? "Active mode: the client says where it is listening (PORT), then asks for the file." : "Passive mode: the client asks the server to listen (PASV) on a high port, then asks for the file.", "RETR");
  if (active) L.msg("s20", "c", t, t + 2, "SYN (from port 20)", "control", { channel: "data", fields: [["Direction", "server → client"]] });
  else L.msg("c", "s20", t, t + 2, "SYN (to port 50100)", "control", { channel: "data", fields: [["Direction", "client → server"]] });
  t += 2;
  L.frame(active ? "The server opens the data connection from its port 20 back to the client. (Firewalls on the client side often block exactly this — which is why passive mode exists.)" : "The client opens the data connection to the port the server named. Both connections are client-initiated, so firewalls are happy.", "data conn", {
    predict: ask(
      `In ${active ? "active" : "passive"} mode, who opens the data connection?`,
      active ? "The server" : "The client",
      ["The server", "The client", "Nobody — it reuses port 21"],
      active ? "Active: the server connects from port 20 to the port the client gave in PORT." : "Passive: the client connects to the port the server gave in its 227 reply.",
      active ? 0 : 1,
    ),
  });
  for (let i = 0; i < 3; i++) L.msg("s20", "c", t + i, t + i + 2, `data ${i + 1}`, "data", { channel: "data", fields: [["File", "notes.pdf"], ["Chunk", `${i + 1} / 3`]] });
  t += 5;
  L.msg("s21", "c", t, t + 2, "226 complete", "reply", { channel: "control", fields: [["Reply", "226 Transfer complete"]] });
  L.frame("The file flows over the data connection, which then closes. The control connection reports 226 and stays open for the next command.", "file", {
    message: { text: "Control stayed open; data connection used once", tone: "ok" },
  });
  return L.done(`FTP — ${active ? "active" : "passive"} mode`, ["control connection: TCP port 21, whole session", "data connection: one per file", "active: server connects from port 20", "passive: client connects to a port the server names"], [
    { label: "Connections", value: "2", tone: "signal" },
    { label: "Control", value: "port 21", tone: "amber" },
    { label: "Data", value: active ? "port 20" : "port 50100", tone: "mint" },
  ]);
}

// --- Email -----------------------------------------------------------------------

function email(): LadderProgram {
  const L = new Ladder([
    HOST("a", "Alice's app"),
    { id: "ms", label: "gmail.com", sub: "Alice's mail server", kind: "mail" },
    { id: "mr", label: "srmist.edu.in", sub: "Bob's mail server", kind: "mail" },
    HOST("b", "Bob's app"),
  ]);
  let t = 0;
  L.frame("Alice sends Bob an email. It does not go to Bob — it goes to Alice's mail server, then to Bob's, where it waits until Bob asks for it.", "ready");
  for (const [lab, f] of [["HELO / MAIL FROM", "MAIL FROM:<alice@gmail.com>"], ["RCPT TO", "RCPT TO:<bob@srmist.edu.in>"], ["DATA", "Subject: CN notes …"]] as const) {
    L.msg("a", "ms", t, t + 2, lab, "data", { fields: [["Protocol", "SMTP, TCP port 587"], ["Command", f]] });
    t += 2;
  }
  L.frame("Alice's app pushes the message to her own server with SMTP.", "SMTP 1", {
    predict: ask(
      "Which protocol does Alice's mail app use to send the message?",
      "SMTP",
      ["POP3", "IMAP", "HTTP"],
      "SMTP is the push protocol — for sending and relaying mail.",
      2,
    ),
  });
  L.mark("ms", t, "note", "DNS: MX srmist.edu.in?");
  t += 1;
  L.msg("ms", "mr", t, t + 3, "SMTP relay", "data", { fields: [["Protocol", "SMTP, TCP port 25"], ["Found via", "DNS MX record"]] });
  t += 3;
  L.mark("mr", t, "buffer", "Bob's mailbox");
  L.frame("Alice's server looks up the MX record for srmist.edu.in, then relays the message server-to-server — still SMTP. It lands in Bob's mailbox, and waits.", "relay", {
    predict: ask(
      "Server to server — which protocol?",
      "SMTP",
      ["IMAP", "POP3", "FTP"],
      "Relaying between servers is SMTP too; only the final collection by the recipient is different.",
      0,
    ),
  });
  t += 4;
  L.msg("b", "mr", t, t + 2, "FETCH", "query", { fields: [["Protocol", "IMAP, TCP port 993"], ["Command", "FETCH 1 BODY[]"]] });
  L.msg("mr", "b", t + 2, t + 4, "message", "reply", { fields: [["From", "alice@gmail.com"], ["Subject", "CN notes"]] });
  L.frame("Hours later Bob opens his app, which pulls the message from his server with IMAP (or POP3). SMTP pushes; IMAP and POP3 pull.", "IMAP", {
    message: { text: "Push with SMTP, pull with IMAP / POP3", tone: "ok" },
    predict: ask(
      "Bob's app collects the message from his server with…",
      "IMAP or POP3",
      ["SMTP", "HTTP only", "DNS"],
      "SMTP cannot pull. Bob's server holds the mail until his app fetches it with a retrieval protocol.",
      1,
    ),
  });
  return L.done("Email — SMTP, then IMAP", ["user agent → own server: SMTP (push)", "server looks up MX record in DNS", "server → server: SMTP relay", "recipient's agent ← server: POP3 or IMAP (pull)"], [
    { label: "Hops", value: "3", tone: "signal" },
    { label: "Push", value: "SMTP", tone: "amber" },
    { label: "Pull", value: "IMAP / POP3", tone: "mint" },
  ]);
}

// --- Telnet -------------------------------------------------------------------

function telnet(p: LadderParams): LadderProgram {
  const keys = (p.keys || "ls").slice(0, 6);
  const L = new Ladder([HOST("c", "Your terminal"), SERVER("s", "Remote host", "port 23")]);
  let t = 0;
  L.msg("c", "s", t, t + 2, "SYN", "control", {});
  L.msg("s", "c", t + 2, t + 4, "SYN-ACK", "control", {});
  t += 4;
  L.frame("Telnet opens an ordinary TCP connection to port 23. Everything you type will be sent to the remote shell.", "TCP");
  L.msg("s", "c", t, t + 2, "login:", "reply", {});
  L.msg("c", "s", t + 2, t + 4, "devesh / pass123", "data", { fields: [["Sent as", "plain text"], ["Encrypted", "no"]] });
  t += 4;
  L.frame("You log in — and your username and password cross the network as readable text. Anyone capturing packets can read them. This is why SSH (port 22) replaced Telnet.", "login", {
    message: { text: "Password sent in clear text", tone: "error" },
    predict: ask(
      "How is the Telnet password protected on the wire?",
      "It isn't — it is plain text",
      ["It is encrypted with TLS", "It is hashed", "Telnet never sends passwords"],
      "Telnet has no encryption at all; that is its fatal flaw.",
      2,
    ),
  });
  keys.split("").forEach((k, i) => {
    L.msg("c", "s", t, t + 2, `'${k}'`, "data", { fields: [["Byte", `'${k}' = 0x${k.charCodeAt(0).toString(16)}`]] });
    L.msg("s", "c", t + 2, t + 4, `echo '${k}'`, "reply", { fields: [["Byte", `'${k}'`], ["Why", "the remote side echoes it"]] });
    L.frame(
      `You press '${k}'. It is sent to the remote host on its own, and the remote side echoes it back — so what you see on your screen came from the server.`,
      `'${k}'`,
      i === 0
        ? {
            predict: ask(
              `You type '${k}'. What does your screen show, and where did it come from?`,
              `'${k}', echoed back by the remote host`,
              [`'${k}', drawn locally before sending`, "Nothing until you press Enter", "An ACK number"],
              "Telnet sends each keystroke as you type it; the remote end echoes characters back.",
              1,
            ),
          }
        : {},
    );
    t += 4;
  });
  L.msg("c", "s", t, t + 2, "⏎", "data", {});
  L.msg("s", "c", t + 2, t + 5, "output", "reply", { fields: [["Output", "notes.pdf  lab1.c  a.out"]] });
  L.frame(`Enter runs '${keys}' on the remote machine; its output comes back over the same connection.`, "run", { message: { text: `${keys.length * 2 + 2} messages for a ${keys.length}-letter command`, tone: "info" } });
  return L.done(`Telnet — "${keys}"`, ["TCP connection to port 23", "every keystroke sent as you type", "remote side echoes characters", "no encryption — use SSH (port 22)"], [
    { label: "Port", value: "23", tone: "signal" },
    { label: "Keystrokes", value: String(keys.length), tone: "signal" },
    { label: "Encryption", value: "none", tone: "coral" },
  ]);
}

// --- DNS ----------------------------------------------------------------------

export function dnsParts(domain: string) {
  const labels = domain.replace(/\.$/, "").split(".").filter(Boolean);
  const tld = labels[labels.length - 1] ?? "com";
  const zone = labels.slice(-2).join(".") || "example.com";
  return { tld, zone, host: domain };
}

function dns(p: LadderParams): LadderProgram {
  const domain = (p.domain || "www.example.com").toLowerCase();
  const { tld, zone } = dnsParts(domain);
  const ip = "93.184.216.34";
  const L = new Ladder([
    HOST("h", "Your laptop"),
    { id: "r", label: "Resolver", sub: "ISP · recursive", kind: "dns" },
    { id: "root", label: "Root", sub: "a.root-servers.net", kind: "dns" },
    { id: "tld", label: `.${tld}`, sub: "TLD server", kind: "dns" },
    { id: "auth", label: zone, sub: "authoritative", kind: "dns" },
  ]);
  let t = 0;
  L.side = { title: "Resolver cache", rows: [[domain, "—"]] };
  L.frame(`Your browser needs the IP address of ${domain}. It asks one server — its resolver — and lets the resolver do the legwork.`, "ready");
  L.msg("h", "r", t, t + 2, `A? ${domain}`, "query", { fields: [["Type", "A (IPv4 address)"], ["Kind", "recursive — 'find it for me'"], ["Transport", "UDP port 53"]] });
  t += 2;
  L.msg("r", "root", t, t + 2, `A? ${domain}`, "query", { fields: [["Kind", "iterative"]] });
  L.msg("root", "r", t + 2, t + 4, `ask .${tld}`, "reply", { fields: [["Answer", "none"], ["Referral", `NS for .${tld} → a.gtld-servers.net`]] });
  t += 4;
  L.frame(`The resolver starts at a root server. The root does not know ${domain} — it answers with a referral: "ask the .${tld} servers".`, "root", {
    predict: ask(
      `The root server is asked for ${domain}. What does it answer?`,
      `A referral to the .${tld} servers`,
      [`The IP address ${ip}`, "Not found", `A referral to ${zone}'s own server`],
      "Root servers only know who runs each top-level domain. Each level hands you one step closer.",
      1,
    ),
  });
  L.msg("r", "tld", t, t + 2, `A? ${domain}`, "query", { fields: [["Kind", "iterative"]] });
  L.msg("tld", "r", t + 2, t + 4, `ask ${zone}`, "reply", { fields: [["Referral", `NS for ${zone} → ns1.${zone}`]] });
  t += 4;
  L.frame(`The .${tld} server doesn't know either, but it knows who is authoritative for ${zone}: another referral.`, `.${tld}`);
  L.msg("r", "auth", t, t + 2, `A? ${domain}`, "query", { fields: [["Kind", "iterative"]] });
  L.msg("auth", "r", t + 2, t + 4, ip, "reply", { fields: [["Answer", `${domain} A ${ip}`], ["TTL", "3600 s"], ["Authoritative", "yes"]] });
  t += 4;
  L.side = { title: "Resolver cache", rows: [[domain, `${ip} (TTL 3600 s)`], [`.${tld} NS`, "cached"], [`${zone} NS`, "cached"]] };
  L.frame(`${zone}'s own name server has the answer: ${ip}. The resolver caches it — and the referrals — for the TTL.`, "answer", {
    predict: ask(
      `Who finally knows the IP address of ${domain}?`,
      `${zone}'s authoritative server`,
      ["The root server", `The .${tld} server`, "The resolver, from the start"],
      "Only the zone's authoritative server holds its records; everyone above just points the way.",
      2,
    ),
  });
  L.msg("r", "h", t, t + 2, ip, "reply", { fields: [["Answer", `${domain} A ${ip}`], ["From", "resolver (recursive answer)"]] });
  t += 2;
  L.frame(`The resolver hands your laptop the final answer. You sent 1 query; the resolver sent 3.`, "done", { message: { text: `${domain} → ${ip}`, tone: "ok" } });
  if (p.cached === "yes") {
    t += 2;
    L.msg("h", "r", t, t + 2, `A? ${domain}`, "query", {});
    L.msg("r", "h", t + 2, t + 4, `${ip} (cached)`, "reply", { fields: [["From", "cache"], ["TTL left", "3540 s"]] });
    L.frame("A minute later a second lookup: the resolver answers straight from its cache. Two messages instead of eight.", "cached", {
      message: { text: "Cache hit — no root, no TLD, no authoritative server", tone: "ok" },
      predict: ask(
        "You look up the same name a minute later. How many messages does it take now?",
        "2",
        ["8", "4", "6"],
        "The answer is cached at the resolver until its TTL runs out — just your query and its reply.",
        0,
      ),
    });
  }
  return L.done(`DNS — resolving ${domain}`, ["laptop → resolver: recursive query", "resolver → root: referral to TLD", "resolver → TLD: referral to authoritative", "resolver → authoritative: the answer", "resolver caches it for the TTL"], [
    { label: "Name", value: domain, tone: "signal" },
    { label: "Answer", value: ip, tone: "mint" },
    { label: "Messages", value: p.cached === "yes" ? "8 + 2 cached" : "8", tone: "amber" },
    { label: "Transport", value: "UDP 53", tone: "signal" },
  ]);
}

// --- Capstone: Packet Journey -------------------------------------------------

function packetJourney(p: LadderParams): LadderProgram {
  const domain = (p.domain || "www.example.com").toLowerCase();
  const ip = "93.184.216.34";
  const x = clampInt(p.isn, 0, 4_000_000_000);
  const L = new Ladder([HOST("b", "Browser", "10.0.0.5"), { id: "r", label: "DNS resolver", sub: "10.0.0.1", kind: "dns" }, SERVER("s", "Web server", ip)]);
  const eth = (to: string): [string, string][] => [["Ethernet dst", to === "gw" ? "gateway's MAC (via ARP)" : "next hop's MAC"], ["Ethernet src", "a4:5e:60:1b:22:9c"]];
  let t = 0;
  L.side = { title: "Where we are", rows: [["Unit 5", "DNS"], ["Next", "TCP"]] };
  L.frame(`You type ${domain} and press Enter. Before a single byte of the page can move, the whole course has to happen — watch each unit take its turn.`, "enter");
  L.msg("b", "r", t, t + 2, `DNS A? ${domain}`, "query", { fields: [["App (Unit 5)", `DNS query A ${domain}`], ["Transport (Unit 5)", "UDP 51000 → 53"], ["Network (Unit 2–3)", "IP 10.0.0.5 → 10.0.0.1, TTL 64"], ...eth("gw")] });
  L.msg("r", "b", t + 2, t + 4, ip, "reply", { fields: [["App", `${domain} A ${ip}`], ["Transport", "UDP 53 → 51000"]] });
  t += 4;
  L.frame(`Unit 5 — DNS turns the name into ${ip}. It rides on UDP: one question, one answer, no connection.`, "DNS", {
    predict: ask(
      "What has to happen first when you press Enter?",
      "Find the server's IP address with DNS",
      ["Open a TCP connection", "Send the HTTP GET", "Ask the router for a route"],
      "Nothing can be addressed until the name becomes an IP address.",
      0,
    ),
  });
  L.side = { title: "Where we are", rows: [["Unit 5", "TCP handshake"], ["Next", "HTTP"]] };
  L.msg("b", "s", t, t + 3, "SYN", "control", { fields: [["Transport", `TCP 51001 → 80, SYN, seq ${x}`], ["Network", `IP 10.0.0.5 → ${ip}`], ["Routing (Unit 3)", "each router: longest-prefix match, TTL − 1"], ...eth("gw")] });
  L.msg("s", "b", t + 3, t + 6, "SYN-ACK", "control", { fields: [["Transport", `SYN, ACK · seq 5000, ack ${x + 1}`]] });
  L.msg("b", "s", t + 6, t + 9, "ACK", "control", { fields: [["Transport", `ACK · ack 5001`]] });
  t += 9;
  L.frame("Unit 5 — the three-way handshake opens a TCP connection to port 80. Every one of these packets is routed hop by hop (Unit 3) and framed per link (Unit 4).", "TCP", {
    predict: ask(
      `The SYN had seq ${x}. What ack does the SYN-ACK carry?`,
      String(x + 1),
      [String(x), "5001", String(x + 2)],
      "The SYN consumes one sequence number, so the server expects x + 1.",
      2,
    ),
  });
  L.side = { title: "Where we are", rows: [["Unit 5", "HTTP"], ["Every hop", "Units 1–4"]] };
  L.msg("b", "s", t, t + 3, "GET /", "query", { fields: [["App", `GET / HTTP/1.1 · Host: ${domain}`], ["Transport", `TCP seq ${x + 1}`], ["Network", `IP → ${ip}`], ["Data link (Unit 4)", "Ethernet frame + CRC-32"], ["Physical (Unit 1)", "bits as voltage / light"]] });
  L.msg("s", "b", t + 3, t + 6, "200 OK", "reply", { fields: [["App", "HTTP/1.1 200 OK · text/html"], ["Transport", "TCP, 3 segments, each ACKed"]] });
  t += 6;
  L.frame("Unit 5 — HTTP asks for the page and the server replies 200 OK. Wrapped around that request: a TCP header, an IP header, an Ethernet header and trailer, then bits on a wire. That is the whole stack from Unit 1.", "HTTP", {
    predict: ask(
      "Which header on the GET is rewritten at every router along the way?",
      "The Ethernet header",
      ["The IP addresses", "The TCP ports", "The HTTP request line"],
      "IP addresses and ports are end to end; each link gets a fresh Ethernet header with that link's MAC addresses (and IP's TTL drops by one).",
      1,
    ),
  });
  L.msg("b", "s", t, t + 3, "FIN", "control", { fields: [["Transport", "FIN"]] });
  L.msg("s", "b", t + 3, t + 6, "FIN-ACK", "control", { fields: [["Transport", "FIN, ACK"]] });
  L.msg("b", "s", t + 6, t + 9, "ACK", "control", {});
  L.frame("Page loaded, connection closed. Ten messages, five layers, every unit of the course.", "done", { message: { text: `${domain} loaded — DNS → TCP → HTTP → close`, tone: "ok" } });
  return L.done(`Packet Journey — ${domain}`, ["DNS: name → IP (UDP)", "TCP: three-way handshake", "HTTP: GET → 200 OK", "every packet: routed per hop, framed per link, sent as bits", "TCP close"], [
    { label: "Messages", value: "10", tone: "signal" },
    { label: "Protocols", value: "DNS · TCP · HTTP", tone: "amber" },
    { label: "Server", value: ip, tone: "mint" },
  ]);
}

// --- dispatcher & setup ---------------------------------------------------------

export function runLadderOperation(p: LadderParams): LadderProgram {
  switch (p.op) {
    case "stopAndWait":
      return flowControl(p, "sw");
    case "arq":
      return flowControl(p, "arq");
    case "slidingWindow":
      return flowControl(p, "gbn");
    case "handshake":
      return handshake(p);
    case "tcpReliability":
      return tcpReliability(p);
    case "tcpFlowControl":
      return tcpFlowControl(p);
    case "udp":
      return udp(p);
    case "http":
      return http(p);
    case "ftp":
      return ftp(p);
    case "email":
      return email();
    case "telnet":
      return telnet(p);
    case "dns":
      return dns(p);
    case "packetJourney":
      return packetJourney(p);
  }
}

const lossOptions = (n: number, what: string) => [{ value: 0, label: "none" }, ...Array.from({ length: n }, (_, i) => ({ value: i + 1, label: `${what} ${i + 1}` }))];

export function ladderControls(op: LadderOp, p: LadderParams): ControlSet {
  const DOMAIN = { key: "domain", label: "Domain name", type: "text" as const, maxLength: 40, pattern: "^[a-zA-Z0-9-]+(\\.[a-zA-Z0-9-]+)+$", hint: "Press Enter to resolve it." };
  switch (op) {
    case "stopAndWait":
      return { title: "Stop-and-Wait", icon: "pause_circle", controls: [{ key: "frames", label: "Frames", type: "number", min: 1, max: 6 }], tryThis: "Count the ticks: with one frame in flight, most of the time the link is idle." };
    case "arq":
      return {
        title: "Stop-and-Wait ARQ",
        icon: "replay",
        controls: [
          { key: "frames", label: "Frames", type: "number", min: 1, max: 6 },
          { key: "lose", label: "Lose data frame", type: "chips", options: lossOptions(Math.min(6, p.frames), "F"), columns: 4 },
          { key: "loseAck", label: "Lose ACK for", type: "chips", options: lossOptions(Math.min(6, p.frames), "F"), columns: 4, hint: "A lost ACK makes the receiver see a duplicate." },
        ],
        tryThis: "Lose an ACK instead of a frame, and watch the receiver throw away a duplicate.",
      };
    case "slidingWindow":
      return {
        title: "Go-Back-N",
        icon: "view_carousel",
        controls: [
          { key: "frames", label: "Frames", type: "number", min: 2, max: 10 },
          { key: "window", label: "Window size N", type: "chips", options: [1, 2, 3, 4, 5, 6].map((v) => ({ value: v, label: String(v) })), columns: 6 },
          { key: "lose", label: "Lose frame", type: "chips", options: lossOptions(Math.min(10, p.frames), "F"), columns: 4 },
        ],
        tryThis: "Set N = 1 — Go-Back-N becomes stop-and-wait. Then raise N and count how many frames one loss costs.",
      };
    case "handshake":
      return { title: "Handshake", icon: "handshake", controls: [{ key: "isn", label: "Client ISN (x)", type: "number", min: 0, max: 4000000000, hint: "Every seq and ack number follows from this." }] };
    case "tcpReliability":
      return {
        title: "TCP reliability",
        icon: "verified",
        controls: [
          { key: "frames", label: "Segments", type: "number", min: 3, max: 8 },
          { key: "mss", label: "Segment size (MSS)", type: "number", min: 100, max: 1460, suffix: "B" },
          { key: "lose", label: "Lose segment", type: "chips", options: lossOptions(Math.min(8, p.frames), "#"), columns: 4 },
          { key: "isn", label: "ISN", type: "number", min: 0, max: 4000000000 },
        ],
        tryThis: "Lose the second-to-last segment: fewer than 3 duplicate ACKs come back, so the sender has to wait for its timer.",
      };
    case "tcpFlowControl":
      return {
        title: "Flow control",
        icon: "tune",
        controls: [
          { key: "rwnd", label: "Receiver buffer (segments)", type: "number", min: 2, max: 6 },
          { key: "mss", label: "MSS", type: "number", min: 100, max: 1460, suffix: "B" },
        ],
      };
    case "udp":
      return {
        title: "UDP",
        icon: "bolt",
        controls: [
          { key: "frames", label: "Datagrams", type: "number", min: 2, max: 8 },
          { key: "lose", label: "Lose datagram", type: "chips", options: lossOptions(Math.min(8, p.frames), "#"), columns: 4 },
        ],
      };
    case "http":
      return {
        title: "HTTP",
        icon: "language",
        controls: [DOMAIN, { key: "persistent", label: "Connection", type: "select", options: [{ value: "yes", label: "Persistent (keep-alive)" }, { value: "no", label: "Non-persistent (close)" }] }],
        tryThis: "Switch to non-persistent and count the extra round trips.",
      };
    case "ftp":
      return { title: "FTP", icon: "folder_shared", controls: [{ key: "ftpMode", label: "Mode", type: "select", options: [{ value: "active", label: "Active (PORT)" }, { value: "passive", label: "Passive (PASV)" }] }] };
    case "telnet":
      return { title: "Telnet", icon: "terminal", controls: [{ key: "keys", label: "Command to type", type: "text", maxLength: 6, placeholder: "ls" }] };
    case "dns":
      return {
        title: "DNS",
        icon: "travel_explore",
        controls: [DOMAIN, { key: "cached", label: "Look it up again?", type: "select", options: [{ value: "no", label: "Once" }, { value: "yes", label: "Again a minute later (cache)" }] }],
      };
    case "packetJourney":
      return { title: "Your request", icon: "conversion_path", controls: [DOMAIN, { key: "isn", label: "Client ISN", type: "number", min: 0, max: 4000000000 }] };
    default:
      return { title: "Setup", icon: "tune", controls: [] };
  }
}
