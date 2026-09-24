// ---------------------------------------------------------------------------
// macEngine — many stations, one channel.
//
// A time chart: one row per station, each transmission a bar. Bars that
// overlap in time are a collision. Every scheme is simulated on a small
// deterministic clock (seeded "random" backoffs), so the student's inputs
// — station count, frame length, slotted or not — change what collides.
// ---------------------------------------------------------------------------

import type { MacProgram, MacStation, MacStep, MacTx, Prediction, StepMessage } from "@/types/visualization";
import type { ControlSet } from "./controls.ts";
import { ask, near } from "./lessonKit.ts";

export type MacOp = "macProblem" | "aloha" | "csmaCd" | "csmaCa" | "tokenRing";

export interface MacParams {
  op: MacOp;
  stations: number;
  /** Frame length in time units. */
  frameLen: number;
  slotted: "no" | "yes";
  seed: number;
  rtsCts: "yes" | "no";
}

export const MAC_DEFAULTS: MacParams = { op: "aloha", stations: 4, frameLen: 3, slotted: "no", seed: 7, rtsCts: "yes" };
const IDS = ["A", "B", "C", "D", "E", "F"];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number.isFinite(v) ? v : lo)));

/** Tiny deterministic PRNG so "random" backoffs replay identically. */
function rng(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0) / 2 ** 32);
}

class Chart {
  steps: MacStep[] = [];
  txs: MacTx[] = [];
  stations: MacStation[];
  constructor(n: number) {
    this.stations = IDS.slice(0, n).map((id) => ({ id, label: `Station ${id}`, state: "idle" }));
  }
  set(id: string, state: MacStation["state"]) {
    const s = this.stations.find((x) => x.id === id);
    if (s) s.state = state;
  }
  tx(station: string, start: number, end: number, kind: MacTx["kind"], label?: string, state: MacTx["state"] = "ok"): MacTx {
    const t: MacTx = { id: `t${this.txs.length}`, station, start, end, kind, state, label };
    this.txs.push(t);
    return t;
  }
  frame(now: number, description: string, label: string, extra: { predict?: Prediction; message?: StepMessage; channel?: MacStep["channel"]; token?: string; readout?: [string, string][]; codeLines?: number[] } = {}) {
    this.steps.push({
      stations: this.stations.map((s) => ({ ...s })),
      txs: this.txs.filter((t) => t.start <= now).map((t) => ({ ...t })),
      now,
      tMax: 0,
      channel: extra.channel ?? "idle",
      description,
      label,
      ...extra,
    });
  }
  done(title: string, pseudocode: string[], stats: MacProgram["stats"], slot?: number, ring?: boolean): MacProgram {
    const tMax = Math.max(12, ...this.txs.map((t) => t.end)) + 1;
    this.steps.forEach((s) => {
      s.tMax = tMax;
      s.slot = slot;
      s.ring = ring;
    });
    return { steps: this.steps, title, pseudocode, stats };
  }
}

/** Marks frames whose airtime overlaps another's as collided. */
function markCollisions(txs: MacTx[]) {
  const data = txs.filter((t) => t.kind === "data");
  for (const a of data) for (const b of data) if (a !== b && a.start < b.end && b.start < a.end) a.state = "collided";
}

// --- the MAC problem ---------------------------------------------------------

function macProblem(p: MacParams): MacProgram {
  const n = clamp(p.stations, 2, 6);
  const L = clamp(p.frameLen, 2, 5);
  const C = new Chart(n);
  C.frame(0, `${n} stations share one cable. Only one signal can be on it at a time — whoever talks while someone else is talking destroys both messages.`, "shared", { codeLines: [1] });
  C.stations.forEach((s, i) => {
    C.tx(s.id, 1 + (i % 2), 1 + (i % 2) + L, "data", "frame");
    C.set(s.id, "sending");
  });
  markCollisions(C.txs);
  C.stations.forEach((s) => C.set(s.id, "collided"));
  C.frame(1 + L, `Everyone has a frame ready, so everyone sends at once. Every frame overlaps another: all ${n} are garbage.`, "all talk", {
    channel: "collision",
    message: { text: `${n} frames sent · 0 delivered`, tone: "error" },
    codeLines: [2],
    predict: ask(`All ${n} stations transmit at the same moment. How many frames get through?`, "0", ["1", String(n), String(Math.ceil(n / 2))], "Any overlap corrupts every frame involved.", n),
  });
  C.frame(1 + L, "So the stations need rules. Three families: random access (ALOHA, CSMA — try, and cope with collisions), controlled access (token passing — take turns), and channelization (FDMA, TDMA, CDMA — split the channel).", "rules", {
    channel: "idle",
    codeLines: [3],
    message: { text: "Random access · Controlled access · Channelization", tone: "info" },
  });
  C.stations.forEach((s, i) => {
    C.tx(s.id, 8 + i * L, 8 + (i + 1) * L, "data", `slot ${i + 1}`);
    C.set(s.id, "done");
  });
  C.frame(8 + n * L, `The simplest fix, TDMA: give each station its own time slot. No collisions ever — but a station with nothing to send still owns its slot, and it sits idle.`, "TDMA", {
    codeLines: [3],
    message: { text: `${n} delivered, 0 collisions — but fixed slots waste idle time`, tone: "ok" },
    predict: ask("With fixed time slots per station, what goes wrong when only one station is busy?", "Most slots sit empty", ["Frames collide", "The busy station can use every slot", "Nothing — it's perfect"], "TDMA is collision-free but wastes the idle stations' slots.", 1),
  });
  return C.done(`The MAC Problem — ${n} stations`, ["one shared channel", "two at once → collision", "rules: random, controlled, or channelized access"], [
    { label: "Stations", value: String(n), tone: "signal" },
    { label: "Free-for-all", value: "0 delivered", tone: "coral" },
    { label: "TDMA", value: `${n} delivered`, tone: "mint" },
  ]);
}

// --- ALOHA -------------------------------------------------------------------

function aloha(p: MacParams): MacProgram {
  const n = clamp(p.stations, 2, 6);
  const L = clamp(p.frameLen, 2, 5);
  const slotted = p.slotted === "yes";
  const r = rng(p.seed);
  const C = new Chart(n);
  const H = 10 * L;
  // Each station has one frame ready at a random moment.
  const ready = C.stations.map(() => Math.floor(r() * H * 0.6));
  C.frame(0, `${slotted ? "Slotted" : "Pure"} ALOHA: when a station has a frame, it just sends it${slotted ? " — but only at the start of the next slot" : ""}. Each frame takes ${L} time units.`, "rules", { codeLines: [1] });
  const order = C.stations.map((s, i) => ({ s, t: slotted ? Math.ceil(ready[i] / L) * L : ready[i] })).sort((a, b) => a.t - b.t);
  const attempts: MacTx[] = [];
  for (const { s, t } of order) attempts.push(C.tx(s.id, t, t + L, "data", s.id));
  markCollisions(C.txs);
  let asked = false;
  for (const a of attempts) {
    C.set(a.station, a.state === "collided" ? "collided" : "done");
    const hits = attempts.filter((b) => b !== a && b.start < a.end && a.start < b.end).map((b) => b.station);
    C.frame(
      a.end,
      a.state === "collided"
        ? `Station ${a.station} sends at t=${a.start}, but ${hits.join(", ")} overlap${hits.length === 1 ? "s" : ""} with it — collision. ${slotted ? "In slotted ALOHA frames either overlap completely or not at all." : "Even a one-unit overlap at the edge ruins both."}`
        : `Station ${a.station} sends at t=${a.start}; nobody else is on the air during its ${L} units. Delivered.`,
      `${a.station} ${a.state === "collided" ? "✕" : "✓"}`,
      {
        channel: a.state === "collided" ? "collision" : "busy",
        codeLines: [2],
        predict:
          !asked && hits.length
            ? ((asked = true),
              ask(`Station ${a.station} starts at t=${a.start} while ${hits[0]} is on the air. What happens?`, "Both frames are destroyed", [`${a.station}'s frame wins`, `${hits[0]}'s frame wins`, `${a.station} waits for silence`], "ALOHA doesn't listen before sending, so any overlap is a collision for both.", a.start))
            : undefined,
      },
    );
  }
  // Collided stations back off and retry once.
  let t0 = Math.max(...attempts.map((a) => a.end));
  const failed = attempts.filter((a) => a.state === "collided");
  failed.forEach((a, i) => {
    const wait = 1 + Math.floor(r() * 3) * L + i * L;
    const s = slotted ? Math.ceil((t0 + wait) / L) * L : t0 + wait;
    C.tx(a.station, s, s + L, "data", `${a.station} retry`);
    C.set(a.station, "done");
  });
  markCollisions(C.txs);
  t0 = Math.max(...C.txs.map((t) => t.end));
  const ok = C.txs.filter((t) => t.state === "ok").length;
  C.frame(t0, `Collided stations wait a random time and try again. ${ok} of ${C.txs.length} transmissions succeeded.`, "retry", {
    codeLines: [3],
    message: { text: `${ok} / ${C.txs.length} transmissions got through`, tone: ok === C.txs.length ? "ok" : "warn" },
    predict: ask("After a collision, how long does an ALOHA station wait before retrying?", "A random time", ["Exactly one frame time", "Until the channel is idle", "It never retries"], "Random backoff — if both waited the same fixed time, they'd collide again.", 2),
  });
  C.frame(t0, slotted ? "Slotted ALOHA's vulnerable time is 1 frame time: max throughput S = G·e^(−G) = 1/e ≈ 36.8% at G = 1." : "Pure ALOHA's vulnerable time is 2 frame times — anything starting within one frame before or after you collides. Max throughput S = G·e^(−2G) = 1/(2e) ≈ 18.4% at G = 0.5.", "S max", {
    codeLines: [4],
    message: { text: slotted ? "Max throughput 36.8%" : "Max throughput 18.4%", tone: "info" },
    predict: ask(`What is the maximum throughput of ${slotted ? "slotted" : "pure"} ALOHA?`, slotted ? "36.8%" : "18.4%", ["18.4%", "36.8%", "50%", "100%"], slotted ? "S = 1/e when G = 1." : "S = 1/(2e) when G = 0.5.", slotted ? 0 : 1),
  });
  return C.done(`${slotted ? "Slotted" : "Pure"} ALOHA — ${n} stations`, ["frame ready → send (slotted: at next slot start)", "overlap → collision, both lost", "wait a random time, resend", `S = G·e^(${slotted ? "−G" : "−2G"})`], [
    { label: "Stations", value: String(n), tone: "signal" },
    { label: "Delivered", value: `${ok} / ${C.txs.length}`, tone: "amber" },
    { label: "Vulnerable time", value: slotted ? "1 × T" : "2 × T", tone: "coral" },
    { label: "Max S", value: slotted ? "36.8%" : "18.4%", tone: "mint" },
  ], slotted ? L : undefined);
}

// --- CSMA/CD -----------------------------------------------------------------

function csmaCd(p: MacParams): MacProgram {
  const L = clamp(p.frameLen, 3, 6);
  const C = new Chart(3);
  C.frame(0, "CSMA/CD (classic Ethernet): listen before talking, and keep listening while you talk.", "rules", { codeLines: [1] });
  C.tx("A", 0, 1, "sense", "sense");
  C.tx("A", 1, 1 + L, "data", "A");
  C.set("A", "sending");
  C.frame(1, "A senses the cable idle and starts sending.", "A sends", { channel: "busy", codeLines: [1, 2] });
  C.tx("C", 2, 3, "sense", "sense");
  C.set("C", "waiting");
  C.frame(3, "C wants to send, senses the carrier — busy — and waits (1-persistent: it will pounce the moment the line goes quiet).", "C defers", {
    channel: "busy",
    codeLines: [1],
    predict: ask("C senses the cable while A is transmitting. What does C do?", "Wait until the cable is idle", ["Send anyway", "Send a jam signal", "Back off a random time right away"], "Carrier sense: never start while someone else is on the air.", 0),
  });
  const end = 1 + L;
  // B and C both jump in at end.
  C.tx("B", end - 1, end, "sense", "sense");
  const b = C.tx("B", end, end + 2, "data", "B");
  const c = C.tx("C", end, end + 2, "data", "C");
  b.state = c.state = "collided";
  C.set("A", "done");
  C.set("B", "collided");
  C.set("C", "collided");
  C.frame(end + 1, "A finishes. B and C were both waiting — and both start at the same instant. Their signals collide on the wire.", "collide", {
    channel: "collision",
    codeLines: [3],
    predict: ask("B and C both waited for A, then both sense idle at the same moment. What happens?", "They both send, and collide", ["B goes first alphabetically", "They take turns automatically", "The switch buffers one of them"], "Carrier sense can't stop two stations that start at the same time — that's what collision detection is for.", 1),
  });
  C.tx("B", end + 2, end + 3, "jam", "JAM");
  C.tx("C", end + 2, end + 3, "jam", "JAM");
  C.frame(end + 3, "Both detect the collision (the voltage on the wire doesn't match what they sent), stop immediately and send a short jam signal so everyone knows.", "jam", { channel: "collision", codeLines: [4] });
  const kB = 0;
  const kC = 2;
  C.tx("B", end + 3, end + 3 + kB + 1, "backoff", `k=${kB}`);
  C.tx("C", end + 3, end + 3 + kC * 2 + 1, "backoff", `k=${kC}`);
  C.set("B", "backoff");
  C.set("C", "backoff");
  C.frame(end + 4, `Binary exponential backoff: after the 1st collision each picks k from {0, 1} … after the n-th from {0 … 2ⁿ−1}, and waits k slot times. B drew ${kB}, C drew ${kC}.`, "backoff", {
    codeLines: [5],
    predict: ask("After its 2nd collision, a station picks its backoff k from which range?", "0 – 3", ["0 – 1", "0 – 7", "Always 2"], "After collision n, k ∈ {0, …, 2ⁿ − 1}: 2 collisions → 0–3.", 2),
  });
  const bs = end + 4;
  C.tx("B", bs, bs + L, "data", "B");
  C.set("B", "done");
  C.frame(bs + L, "B's backoff runs out first; it senses idle and sends — successfully this time.", "B ✓", { channel: "busy", codeLines: [2] });
  C.tx("C", bs + L, bs + 2 * L, "data", "C");
  C.set("C", "done");
  C.frame(bs + 2 * L, "C was waiting for B; now it sends too. All three frames delivered — one collision cost a few slot times.", "C ✓", { channel: "idle", message: { text: "3 frames, 1 collision, recovered", tone: "ok" }, codeLines: [2] });
  return C.done("CSMA/CD", ["sense carrier; wait while busy", "idle → transmit, and keep listening", "collision detected →", "stop, send jam signal", "binary exponential backoff, try again"], [
    { label: "Stations", value: "3", tone: "signal" },
    { label: "Collisions", value: "1", tone: "coral" },
    { label: "Delivered", value: "3", tone: "mint" },
  ]);
}

// --- CSMA/CA -----------------------------------------------------------------

function csmaCa(p: MacParams): MacProgram {
  const rts = p.rtsCts === "yes";
  const C = new Chart(3);
  C.stations = [
    { id: "A", label: "Laptop A", state: "idle" },
    { id: "AP", label: "Access point", state: "idle" },
    { id: "C", label: "Laptop C", state: "idle" },
  ];
  C.frame(0, "Wi-Fi can't detect collisions — a radio can't hear others while it transmits, and A and C are too far apart to hear each other at all (hidden terminals). So Wi-Fi tries to avoid collisions instead.", "hidden", {
    codeLines: [1],
    predict: undefined,
  });
  C.tx("A", 0, 2, "difs", "DIFS");
  C.tx("A", 2, 4, "backoff", "backoff 2");
  C.set("A", "backoff");
  C.frame(4, "A senses the channel idle for a DIFS interval, then counts down a random backoff before it may send.", "DIFS", {
    codeLines: [2],
    predict: ask("The channel has just gone idle. Why does a Wi-Fi station wait DIFS + a random backoff instead of sending at once?", "So stations that were all waiting don't collide", ["To save battery", "To let the AP finish its ACK", "It's required by TCP"], "Everyone waiting would otherwise pounce together; the random countdown spreads them out.", 1),
  });
  let t = 4;
  if (rts) {
    C.tx("A", t, t + 1, "rts", "RTS");
    C.tx("AP", t + 2, t + 3, "cts", "CTS");
    C.tx("C", t + 3, t + 3 + 8, "backoff", "NAV (silent)");
    C.set("C", "waiting");
    C.frame(t + 3, "A sends a short RTS. The AP answers CTS — and C, which can't hear A, does hear the AP's CTS. It sets its NAV timer and stays silent for the whole exchange.", "RTS/CTS", {
      codeLines: [3],
      predict: ask("C cannot hear A at all. How does C learn that it must stay quiet?", "It hears the AP's CTS", ["It hears A's RTS", "Carrier sense", "It doesn't — they collide"], "The CTS comes from the AP, which both can hear. That's what solves the hidden-terminal problem.", 0),
    });
    t += 3;
  } else {
    C.tx("C", 5, 9, "data", "C", "collided");
  }
  C.tx("A", t, t + 5, "data", "DATA", rts ? "ok" : "collided");
  C.set("A", rts ? "sending" : "collided");
  C.frame(
    t + 5,
    rts ? "A sends its data frame; C holds off. No collision." : "Without RTS/CTS, C can't hear A — it senses an idle channel and transmits. The two collide at the AP, and neither laptop knows.",
    "data",
    { channel: rts ? "busy" : "collision", codeLines: [4], message: rts ? undefined : { text: "Hidden-terminal collision at the AP", tone: "error" } },
  );
  if (rts) {
    C.tx("AP", t + 6, t + 7, "ack", "ACK");
    C.set("A", "done");
    C.frame(t + 7, "After a short SIFS gap the AP sends an ACK. Because Wi-Fi can't detect collisions, the ACK is the only proof the frame arrived.", "ACK", {
      codeLines: [5],
      message: { text: "Delivered: RTS → CTS → DATA → ACK", tone: "ok" },
      predict: ask("How does laptop A know its frame arrived safely?", "The AP sends back an ACK", ["It detected no collision", "TCP tells it", "It assumes so"], "No ACK within a timeout = assume a collision and retry with a bigger backoff.", 3),
    });
  } else {
    C.frame(t + 8, "No ACK comes back, so A must assume a collision, double its contention window and try again. Turn RTS/CTS on to see the fix.", "no ACK", { codeLines: [5], message: { text: "No ACK → retry", tone: "warn" } });
  }
  return C.done(`CSMA/CA${rts ? " with RTS/CTS" : ""}`, ["can't detect collisions on radio → avoid them", "idle for DIFS, then random backoff", "RTS / CTS reserves the medium (NAV)", "send DATA", "receiver ACKs; no ACK → retry"], [
    { label: "RTS/CTS", value: rts ? "on" : "off", tone: rts ? "mint" : "coral" },
    { label: "Collisions", value: rts ? "0" : "1", tone: rts ? "mint" : "coral" },
  ]);
}

// --- Token Ring --------------------------------------------------------------

function tokenRing(p: MacParams): MacProgram {
  const n = clamp(p.stations, 3, 6);
  const L = clamp(p.frameLen, 2, 4);
  const want = new Set(IDS.slice(0, n).filter((_, i) => i % 2 === 1 || i === 0));
  const C = new Chart(n);
  C.frame(0, `${n} stations in a ring. A single special frame — the token — circulates. Only the station holding it may transmit. Stations ${[...want].join(", ")} have data.`, "ring", { token: "A", codeLines: [1] });
  let t = 0;
  let asked = false;
  for (let lap = 0; lap < n; lap++) {
    const id = IDS[lap];
    if (want.has(id)) {
      C.set(id, "holding");
      C.tx(id, t, t + L, "data", id);
      C.frame(t + L, `${id} catches the token, holds it, and sends its frame around the ring. Nobody else can transmit meanwhile — collisions are impossible.`, `${id} sends`, {
        token: id,
        channel: "busy",
        codeLines: [2],
        predict: !asked ? ((asked = true), ask(`Station ${id} holds the token. Can another station transmit at the same time?`, "No — only the token holder may send", ["Yes, if the ring is idle", "Yes, the next station downstream", "Only broadcast frames"], "One token, one transmitter: controlled access means no collisions.", 1)) : undefined,
      });
      C.set(id, "done");
      t += L;
    }
    C.tx(id, t, t + 1, "token", "token →");
    C.frame(t + 1, `${id} passes the token to ${IDS[(lap + 1) % n]}.`, `→ ${IDS[(lap + 1) % n]}`, { token: IDS[(lap + 1) % n], codeLines: [3] });
    t += 1;
  }
  C.frame(t, `One full rotation: every station that had data sent exactly once, in order, with no collisions. The price: a station waits for the token even when the ring is empty — up to ${n} token passes.`, "lap", {
    token: "A",
    codeLines: [4],
    message: { text: `${want.size} frames, 0 collisions, fair turns`, tone: "ok" },
    predict: ask(`With ${n} stations and an otherwise idle ring, how many token passes might a station wait before it can send?`, String(n - 1), near(n - 1, [1, -1, 2]), "Worst case it just passed you: the token must visit every other station first.", n),
  });
  return C.done(`Token Ring — ${n} stations`, ["token circulates around the ring", "have data? hold the token, send the frame", "release the token to the next station", "no collisions; bounded, fair waiting"], [
    { label: "Stations", value: String(n), tone: "signal" },
    { label: "Collisions", value: "0", tone: "mint" },
    { label: "Frames", value: String(want.size), tone: "amber" },
  ], undefined, true);
}

export function runMacOperation(p: MacParams): MacProgram {
  switch (p.op) {
    case "macProblem":
      return macProblem(p);
    case "aloha":
      return aloha(p);
    case "csmaCd":
      return csmaCd(p);
    case "csmaCa":
      return csmaCa(p);
    case "tokenRing":
      return tokenRing(p);
  }
}

export const MAC_OP_DEFAULTS: Partial<Record<MacOp, Partial<MacParams>>> = {
  macProblem: { stations: 4 },
  tokenRing: { stations: 5, frameLen: 2 },
  csmaCd: { frameLen: 4 },
};

export function macControls(op: MacOp): ControlSet {
  const N = (min: number, max: number) => ({ key: "stations", label: "Stations", type: "number" as const, min, max });
  const LEN = { key: "frameLen", label: "Frame length (time units)", type: "number" as const, min: 2, max: 5 };
  switch (op) {
    case "macProblem":
      return { title: "Shared channel", icon: "groups", controls: [N(2, 6), LEN] };
    case "aloha":
      return {
        title: "ALOHA",
        icon: "waves",
        controls: [N(2, 6), LEN, { key: "slotted", label: "Variant", type: "chips", options: [{ value: "no", label: "Pure" }, { value: "yes", label: "Slotted" }] }, { key: "seed", label: "Random seed", type: "number", min: 1, max: 999, hint: "A different seed = different arrival times." }],
        tryThis: "Switch to slotted with the same seed: partial overlaps disappear.",
      };
    case "csmaCd":
      return { title: "CSMA/CD", icon: "hearing", controls: [{ ...LEN, min: 3, max: 6 }] };
    case "csmaCa":
      return { title: "CSMA/CA", icon: "wifi", controls: [{ key: "rtsCts", label: "RTS / CTS", type: "chips", options: [{ value: "yes", label: "On" }, { value: "no", label: "Off" }] }], tryThis: "Turn RTS/CTS off to watch the hidden-terminal collision." };
    case "tokenRing":
      return { title: "Token Ring", icon: "toll", controls: [N(3, 6), { ...LEN, max: 4 }] };
  }
}
