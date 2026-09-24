// ---------------------------------------------------------------------------
// bitEngine — error detection and correction you can watch execute.
//
// Parity counting, one's-complement checksum addition, CRC long division and
// Hamming(7,4) syndrome decoding, all on the student's own bits. A noise
// fault flips a bit on the wire so the receiver's check has something to find
// (or, for two flips under parity, something to miss).
// ---------------------------------------------------------------------------

import type { BitCell, BitProgram, BitRow, BitStep, Prediction, StepMessage } from "@/types/visualization";
import type { ControlSet } from "./controls.ts";
import { ask } from "./lessonKit.ts";

export type BitOp = "parity" | "checksum" | "crc" | "hamming";

export interface BitParams {
  op: BitOp;
  data: string;
  mode: "even" | "odd";
  flips: number;
  words: string;
  gen: string;
  /** Bit index (0-based) the noise flips; -1 = none. For Hamming: position 1–7, 0 = none. */
  flip: number;
}

export const BIT_DEFAULTS: BitParams = { op: "parity", data: "1011001", mode: "even", flips: 1, words: "3A 5C 7E 91", gen: "10011", flip: 3 };

export const BIT_OP_DEFAULTS: Partial<Record<BitOp, Partial<BitParams>>> = {
  parity: { data: "1011001", flips: 1 },
  checksum: { words: "3A 5C 7E 91", flip: 5 },
  crc: { data: "1101011011", gen: "10011", flip: 4 },
  hamming: { data: "1011", flip: 5 },
};

const bits = (s: string) => s.split("").map((c) => (c === "1" ? 1 : 0)) as (0 | 1)[];
const cells = (bs: (0 | 1)[], role: BitCell["role"], state: BitCell["state"] = "idle"): BitCell[] => bs.map((v) => ({ v, role, state }));
const str = (bs: (0 | 1)[]) => bs.join("");
const ones = (bs: (0 | 1)[]) => bs.filter((b) => b === 1).length;

class Script {
  steps: BitStep[] = [];
  cols = 8;
  frame(rows: BitRow[], description: string, label: string, extra: { predict?: Prediction; message?: StepMessage; readout?: [string, string][]; codeLines?: number[] } = {}) {
    this.cols = Math.max(this.cols, ...rows.map((r) => r.cells.length + (r.offset ?? 0)));
    this.steps.push({ rows: rows.map((r) => ({ ...r, cells: r.cells.map((c) => ({ ...c })) })), cols: 0, description, label, ...extra });
  }
  done(title: string, pseudocode: string[], stats: BitProgram["stats"]): BitProgram {
    this.steps.forEach((s) => (s.cols = this.cols));
    return { steps: this.steps, title, pseudocode, stats };
  }
}

// --- parity -------------------------------------------------------------------

function parity(p: BitParams): BitProgram {
  const d = bits(/^[01]{3,16}$/.test(p.data) ? p.data : "1011001");
  const even = p.mode !== "odd";
  const flips = Math.max(0, Math.min(2, Math.round(p.flips)));
  const k = ones(d);
  const pb: 0 | 1 = even ? ((k % 2) as 0 | 1) : ((1 - (k % 2)) as 0 | 1);
  const code = [...d, pb];
  const S = new Script();
  const sender = (st: BitCell["state"] = "idle"): BitRow => ({ id: "data", label: "Data", group: "sender", cells: cells(d, "data", st) });
  S.frame([sender()], `${d.length} data bits to send: ${str(d)}. ${even ? "Even" : "Odd"} parity adds one bit so the total count of 1s is ${even ? "even" : "odd"}.`, "data", { codeLines: [1] });
  S.frame(
    [{ ...sender(), cells: d.map((v) => ({ v, role: "data", state: v ? "active" : "dim" })), note: `${k} ones` }],
    `Count the 1s: there are ${k}.`,
    "count",
    { codeLines: [1] },
  );
  S.frame(
    [{ id: "code", label: "Codeword", group: "sender", cells: [...cells(d, "data"), { v: pb, role: "check", state: "active", tag: "P" }], note: `${k + pb} ones → ${even ? "even" : "odd"}` }],
    `Parity bit = ${pb}, making ${k + pb} ones in total — ${even ? "even" : "odd"}.`,
    "P",
    {
      codeLines: [2],
      predict: ask(
        `The data has ${k} ones. What is the ${even ? "even" : "odd"} parity bit?`,
        String(pb),
        [String(1 - pb)],
        `${even ? "Even" : "Odd"} parity: choose the bit that makes the total number of 1s ${even ? "even" : "odd"}.`,
        k,
      ),
    },
  );
  const flipAt = [Math.floor(code.length / 2), 1].slice(0, flips);
  const wire = code.map((v, i) => (flipAt.includes(i) ? ((1 - v) as 0 | 1) : v));
  const wireRow: BitRow = { id: "wire", label: "Received", group: "receiver", cells: wire.map((v, i) => ({ v, role: i === code.length - 1 ? "check" : "data", state: flipAt.includes(i) ? "flip" : "idle", tag: i === code.length - 1 ? "P" : undefined })) };
  S.frame([{ id: "code", label: "Sent", group: "sender", cells: [...cells(d, "data"), { v: pb, role: "check", state: "idle", tag: "P" }] }, wireRow], flips ? `Noise flips ${flips} bit${flips > 1 ? "s" : ""} on the wire.` : "The codeword crosses the wire untouched.", flips ? `${flips} flip${flips > 1 ? "s" : ""}` : "wire", { codeLines: [3] });
  const kr = ones(wire);
  const ok = even ? kr % 2 === 0 : kr % 2 === 1;
  S.frame(
    [{ ...wireRow, note: `${kr} ones → ${kr % 2 ? "odd" : "even"}` }],
    ok
      ? flips === 2
        ? `The receiver counts ${kr} ones — ${even ? "even" : "odd"}, so it accepts. But two bits are wrong! Two flips cancel out: parity only catches an odd number of errors.`
        : `The receiver counts ${kr} ones — ${even ? "even" : "odd"}, as expected. Accepted.`
      : `The receiver counts ${kr} ones — should be ${even ? "even" : "odd"}. Error detected; the frame is discarded. (Which bit? Parity can't say.)`,
    ok ? (flips ? "missed!" : "✓") : "✗ caught",
    {
      codeLines: [4],
      message: ok ? (flips ? { text: "Two errors, undetected", tone: "error" } : { text: "Parity OK", tone: "ok" }) : { text: "Parity error detected", tone: "warn" },
      predict: ask(
        `${flips} bit${flips === 1 ? "" : "s"} flipped. Will the receiver's parity check notice?`,
        !ok ? "Yes — the parity is wrong" : flips ? "No — the errors cancel out" : "Nothing to notice — it's correct",
        ["Yes — the parity is wrong", "No — the errors cancel out", "Nothing to notice — it's correct"],
        "Each flip changes the count of 1s by one, so one flip breaks parity and two flips restore it.",
        flips,
      ),
    },
  );
  return S.done(`${even ? "Even" : "Odd"} Parity — ${str(d)}`, ["count the 1s in the data", "append P so the total is even (or odd)", "send; noise may flip bits", "receiver recounts: wrong parity → error"], [
    { label: "Data bits", value: String(d.length), tone: "signal" },
    { label: "Parity bit", value: String(pb), tone: "amber" },
    { label: "Flips", value: String(flips), tone: flips ? "coral" : "mint" },
    { label: "Verdict", value: ok ? (flips ? "missed" : "accepted") : "detected", tone: ok && flips ? "coral" : "mint" },
  ]);
}

// --- checksum -------------------------------------------------------------------

const byteBits = (n: number) => bits(n.toString(2).padStart(8, "0"));
const hex = (n: number) => "0x" + n.toString(16).toUpperCase().padStart(2, "0");

function checksum(p: BitParams): BitProgram {
  const ws = (p.words.match(/[0-9a-fA-F]{1,2}/g) ?? ["3A", "5C", "7E", "91"]).slice(0, 5).map((h) => parseInt(h, 16));
  const words = ws.length >= 2 ? ws : [0x3a, 0x5c, 0x7e, 0x91];
  const S = new Script();
  const wordRow = (w: number, i: number, st: BitCell["state"] = "idle"): BitRow => ({ id: `w${i}`, label: `Word ${i + 1}`, group: "sender", cells: cells(byteBits(w), "data", st), note: hex(w) });
  S.frame(words.map((w, i) => wordRow(w, i)), `${words.length} bytes to protect: ${words.map(hex).join(" ")}. The checksum is the one's-complement of their one's-complement sum.`, "words", { codeLines: [1] });
  let sum = words[0];
  let askedWrap = false;
  for (let i = 1; i < words.length; i++) {
    const raw = sum + words[i];
    const wrapped = raw > 255;
    const next = wrapped ? (raw & 255) + 1 : raw;
    S.frame(
      [...words.map((w, j) => wordRow(w, j, j <= i ? "dim" : "idle")), { id: "sum", label: "Sum", group: "work", cells: cells(byteBits(next), "sum", "active"), note: `${hex(next)}${wrapped ? " (carry wrapped)" : ""}` }],
      `${hex(sum)} + ${hex(words[i])} = ${raw > 255 ? `${hex(raw).replace("0x", "0x")} — 9 bits. The carry is added back into the bottom: ${hex(next)}` : hex(next)}.`,
      `+ w${i + 1}`,
      {
        codeLines: [2],
        predict:
          wrapped && !askedWrap
            ? ((askedWrap = true),
              ask(
                `${hex(sum)} + ${hex(words[i])} overflows 8 bits. What happens to the carry?`,
                "It is added back to the lowest bit",
                ["It is thrown away", "It becomes a 9th bit of the checksum", "The sum is reset to 0"],
                "One's-complement addition wraps the carry around ('end-around carry').",
                i,
              ))
            : undefined,
      },
    );
    sum = next;
  }
  const ck = ~sum & 255;
  S.frame([{ id: "sum", label: "Sum", group: "work", cells: cells(byteBits(sum), "sum"), note: hex(sum) }, { id: "ck", label: "Checksum", group: "sender", cells: cells(byteBits(ck), "check", "active"), note: hex(ck) }], `Complement every bit of the sum: checksum = ${hex(ck)}. It travels with the data.`, "invert", {
    codeLines: [3],
    predict: ask(`The sum is ${hex(sum)}. What is the checksum?`, hex(ck), [hex(sum), hex((ck + 1) & 255), hex(255 - ck + 1 > 255 ? 0 : 255 - ck + 1)], "Checksum = one's complement: flip every bit of the sum.", sum),
  });
  const all = [...words, ck];
  const flip = p.flip >= 0 && p.flip < all.length * 8 ? p.flip : -1;
  const rx = all.map((w, i) => (flip >= 0 && Math.floor(flip / 8) === i ? w ^ (1 << (7 - (flip % 8))) : w));
  let rs = 0;
  for (const w of rx) {
    rs += w;
    if (rs > 255) rs = (rs & 255) + 1;
  }
  const ok = rs === 255;
  S.frame(
    rx.map((w, i) => ({ id: `r${i}`, label: i < words.length ? `Word ${i + 1}` : "Checksum", group: "receiver" as const, cells: byteBits(w).map((v, b) => ({ v, role: i < words.length ? ("data" as const) : ("check" as const), state: flip >= 0 && flip === i * 8 + b ? ("flip" as const) : ("idle" as const) })), note: hex(w) })),
    flip >= 0 ? `On the wire, noise flips bit ${flip}.` : "Everything arrives untouched.",
    flip >= 0 ? "flip" : "wire",
    { codeLines: [4] },
  );
  S.frame(
    [{ id: "rs", label: "Receiver sum", group: "receiver", cells: cells(byteBits(rs), "sum", ok ? "ok" : "bad"), note: hex(rs) }],
    ok ? `The receiver adds all ${rx.length} words, checksum included: ${hex(rs)} = all 1s. Complement → 0. Accepted.` : `The receiver's sum is ${hex(rs)}, not 0xFF. The data is corrupt and is discarded.`,
    ok ? "✓" : "✗",
    {
      codeLines: [5],
      message: ok ? { text: "Sum = 0xFF — accepted", tone: "ok" } : { text: "Checksum mismatch — discarded", tone: "error" },
      predict: ask("If nothing went wrong, what should the receiver's sum of everything (checksum included) be?", "0xFF (all 1s)", ["0x00", hex(ck), hex(sum)], "sum + ~sum is all 1s; its complement is 0.", 2),
    },
  );
  return S.done(`Checksum — ${words.map(hex).join(" ")}`, ["add the words with one's-complement (wrap carries)", "", "checksum = NOT(sum)", "send words + checksum", "receiver adds everything: all 1s → OK"], [
    { label: "Words", value: String(words.length), tone: "signal" },
    { label: "Checksum", value: hex(ck), tone: "amber" },
    { label: "Verdict", value: ok ? "accepted" : "rejected", tone: ok ? "mint" : "coral" },
  ]);
}

// --- CRC --------------------------------------------------------------------------

export function crcRemainder(data: string, gen: string): string {
  const g = bits(gen);
  const r = g.length - 1;
  const w = [...bits(data), ...Array(r).fill(0)] as (0 | 1)[];
  for (let i = 0; i + r < w.length; i++) if (w[i]) for (let j = 0; j < g.length; j++) w[i + j] = (w[i + j] ^ g[j]) as 0 | 1;
  return str(w.slice(-r));
}

function crc(p: BitParams): BitProgram {
  const data = /^[01]{4,16}$/.test(p.data) ? p.data : "1101011011";
  const gen = /^1[01]{2,6}1$/.test(p.gen) ? p.gen : "10011";
  const g = bits(gen);
  const r = g.length - 1;
  const n = data.length;
  const w = [...bits(data), ...Array(r).fill(0)] as (0 | 1)[];
  const S = new Script();
  const work = (hi: number, st: BitCell["state"] = "active"): BitRow => ({
    id: "work",
    label: "Dividend",
    group: "work",
    cells: w.map((v, i) => ({ v, role: i < n ? "data" : "pad", state: i < hi ? "dim" : i >= hi && i < hi + g.length ? st : "idle" })),
  });
  S.frame([{ id: "data", label: "Data", group: "sender", cells: cells(bits(data), "data") }, { id: "gen", label: "Generator", group: "work", cells: cells(g, "gen"), note: `degree ${r}` }], `Data ${data}, generator ${gen} (degree ${r}). CRC is binary long division, where subtraction is XOR.`, "setup", { codeLines: [1] });
  S.frame([work(-1, "idle")], `Append ${r} zeros (one per generator degree): ${str(w)}. This is the dividend.`, `+${r} zeros`, {
    codeLines: [2],
    predict: ask(`The generator ${gen} has ${g.length} bits. How many zeros are appended?`, String(r), [String(g.length), String(r - 1), "8"], "Append degree-of-generator zeros = generator length − 1.", r),
  });
  let asked = false;
  for (let i = 0; i + r < w.length; i++) {
    if (!w[i]) continue;
    const before = str(w.slice(i, i + g.length));
    for (let j = 0; j < g.length; j++) w[i + j] = (w[i + j] ^ g[j]) as 0 | 1;
    const after = str(w.slice(i, i + g.length));
    S.frame(
      [work(i), { id: "gen", label: "XOR with", group: "work", offset: i, cells: cells(g, "gen") }],
      `Leading 1 at position ${i}: XOR ${before} with ${gen} → ${after}. Bring down the next bit and repeat.`,
      `÷ ${i}`,
      {
        codeLines: [3],
        predict: !asked ? ((asked = true), ask(`${before} XOR ${gen} = ?`, after, [str(bits(before).map((b, j) => (b | g[j]) as 0 | 1)), str(bits(before).map((b, j) => (b & g[j]) as 0 | 1)), before], "XOR bit by bit: equal → 0, different → 1.", i)) : undefined,
      },
    );
  }
  const rem = str(w.slice(-r));
  const code = data + rem;
  S.frame([{ id: "rem", label: "Remainder", group: "work", cells: cells(bits(rem), "rem", "active") }, { id: "cw", label: "Codeword", group: "sender", cells: [...cells(bits(data), "data"), ...cells(bits(rem), "check")] }], `Remainder = ${rem}. It replaces the appended zeros: send ${code}.`, "CRC", {
    codeLines: [4],
    predict: ask("What goes on the wire?", `${data} followed by ${rem}`, [`${data} followed by ${"0".repeat(r)}`, `${rem} only`, `${data} followed by ${gen}`], "The remainder replaces the zeros; the result divides exactly by the generator.", 1),
  });
  const flip = p.flip >= 0 && p.flip < code.length ? p.flip : -1;
  const rx = code.split("").map((c, i) => (i === flip ? (c === "1" ? "0" : "1") : c)).join("");
  // The receiver divides the codeword as received — no zeros appended.
  const plain = (() => {
    const v = bits(rx);
    for (let i = 0; i + r < v.length; i++) if (v[i]) for (let j = 0; j < g.length; j++) v[i + j] = (v[i + j] ^ g[j]) as 0 | 1;
    return str(v.slice(-r));
  })();
  const ok = /^0+$/.test(plain);
  S.frame([{ id: "rx", label: "Received", group: "receiver", cells: bits(rx).map((v, i) => ({ v, role: i < n ? "data" : "check", state: i === flip ? "flip" : "idle" })) }], flip >= 0 ? `Noise flips bit ${flip} on the wire.` : "The codeword arrives untouched.", flip >= 0 ? "flip" : "wire", { codeLines: [5] });
  S.frame([{ id: "rx", label: "Received", group: "receiver", cells: bits(rx).map((v, i) => ({ v, role: i < n ? "data" : "check", state: i === flip ? "flip" : "idle" })) }, { id: "rrem", label: "Receiver remainder", offset: code.length - r, group: "receiver", cells: cells(bits(plain), "rem", ok ? "ok" : "bad") }], ok ? `The receiver divides the whole codeword by ${gen}: remainder ${plain}. Accepted.` : `The receiver divides by ${gen} and gets remainder ${plain} — not zero. Error detected.`, ok ? "✓" : "✗", {
    codeLines: [5],
    message: ok ? { text: "Remainder 0 — accepted", tone: "ok" } : { text: `Remainder ${plain} ≠ 0 — rejected`, tone: "error" },
    predict: ask("The receiver divides the received codeword by the generator. What remainder means 'no error'?", "All zeros", ["The same CRC that was sent", "All ones", "The generator"], "A correct codeword is an exact multiple of the generator.", 3),
  });
  return S.done(`CRC — ${data} ÷ ${gen}`, ["choose generator G of degree r", "append r zeros to the data", "divide by G using XOR", "remainder replaces the zeros", "receiver divides: remainder 0 → OK"], [
    { label: "Generator", value: gen, tone: "signal" },
    { label: "CRC", value: rem, tone: "amber" },
    { label: "Verdict", value: ok ? "accepted" : "rejected", tone: ok ? "mint" : "coral" },
  ]);
}

// --- Hamming(7,4) -----------------------------------------------------------------

const COVER: Record<number, number[]> = { 1: [1, 3, 5, 7], 2: [2, 3, 6, 7], 4: [4, 5, 6, 7] };
const TAGS = ["p1", "p2", "d1", "p4", "d2", "d3", "d4"];

function hamming(p: BitParams): BitProgram {
  const d = bits(/^[01]{4}$/.test(p.data) ? p.data : "1011");
  const flip = Math.max(0, Math.min(7, Math.round(p.flip)));
  const cw: (0 | 1)[] = [0, 0, d[0], 0, d[1], d[2], d[3]];
  const S = new Script();
  const row = (v: (0 | 1)[], id: string, label: string, hl: number[] = [], group: BitRow["group"] = "sender", flipAt = 0): BitRow => ({
    id,
    label,
    group,
    cells: v.map((b, i) => ({ v: b, role: [0, 1, 3].includes(i) ? "check" : "data", state: flipAt === i + 1 ? "flip" : hl.includes(i + 1) ? "active" : "idle", tag: `${i + 1}·${TAGS[i]}` })),
  });
  S.frame([row(cw, "cw", "Codeword")], `4 data bits ${str(d)} go into positions 3, 5, 6, 7. Positions 1, 2, 4 — the powers of two — hold parity bits.`, "layout", { codeLines: [1] });
  for (const pp of [1, 2, 4]) {
    const cover = COVER[pp].filter((x) => x !== pp);
    const v = (cover.reduce((a, x) => a + cw[x - 1], 0) % 2) as 0 | 1;
    cw[pp - 1] = v;
    S.frame([row(cw, "cw", "Codeword", COVER[pp])], `p${pp} covers positions ${COVER[pp].join(", ")} (every position whose binary has the ${pp} bit set). Even parity over ${cover.join(", ")} → p${pp} = ${v}.`, `p${pp}`, {
      codeLines: [2],
      predict: pp === 1 ? ask(`Bits at positions 3, 5, 7 are ${cover.map((x) => cw[x - 1]).join(", ")}. With even parity, p1 = ?`, String(v), [String(1 - v)], "Make the number of 1s in the group even.", 1) : undefined,
    });
  }
  const rx = cw.map((b, i) => (i + 1 === flip ? ((1 - b) as 0 | 1) : b));
  S.frame([row(cw, "cw", "Sent"), row(rx, "rx", "Received", [], "receiver", flip)], flip ? `Noise flips position ${flip}.` : "It arrives untouched.", flip ? `flip ${flip}` : "wire", { codeLines: [3] });
  const c = [1, 2, 4].map((pp) => COVER[pp].reduce((a, x) => a + rx[x - 1], 0) % 2);
  const syn = c[0] * 1 + c[1] * 2 + c[2] * 4;
  S.frame(
    [row(rx, "rx", "Received", syn ? [syn] : [], "receiver", flip), { id: "syn", label: "Syndrome c4 c2 c1", group: "work", cells: cells([c[2], c[1], c[0]] as (0 | 1)[], "rem", syn ? "bad" : "ok"), note: `= ${syn}` }],
    syn ? `Recheck each group: c1=${c[0]}, c2=${c[1]}, c4=${c[2]}. Read c4c2c1 as binary: ${syn} — that is the position of the bad bit.` : "Every group checks out: syndrome 000. No error.",
    `syn ${syn}`,
    {
      codeLines: [4],
      predict: ask("The receiver rechecks all three groups. What does the syndrome c4c2c1 point to?", flip ? `Position ${flip}` : "0 — no error", [flip ? "0 — no error" : "Position 1", `Position ${((flip || 3) % 7) + 1}`, `Position ${8 - (flip || 1)}`], "The failing checks add up, in binary, to the index of the flipped bit.", flip),
    },
  );
  const fixed = rx.map((b, i) => (i + 1 === syn ? ((1 - b) as 0 | 1) : b));
  S.frame([{ ...row(fixed, "fx", "Corrected", syn ? [syn] : [], "receiver"), cells: row(fixed, "fx", "Corrected").cells.map((cc, i) => ({ ...cc, state: i + 1 === syn ? "ok" : "idle" })) }], syn ? `Flip position ${syn} back. Data bits (3,5,6,7) = ${[fixed[2], fixed[4], fixed[5], fixed[6]].join("")} — fixed without asking for a resend.` : `Data = ${str(d)}.`, "fixed", {
    codeLines: [5],
    message: { text: syn ? `Corrected bit ${syn} — no retransmission needed` : "No error", tone: "ok" },
  });
  return S.done(`Hamming(7,4) — ${str(d)}`, ["data → positions 3,5,6,7", "p1,p2,p4: even parity over their groups", "send 7 bits", "receiver: syndrome = c4c2c1", "flip the bit the syndrome names"], [
    { label: "Codeword", value: str(cw), tone: "signal" },
    { label: "Flipped", value: flip ? `pos ${flip}` : "none", tone: flip ? "coral" : "mint" },
    { label: "Syndrome", value: String(syn), tone: "amber" },
  ]);
}

export function runBitOperation(p: BitParams): BitProgram {
  switch (p.op) {
    case "parity":
      return parity(p);
    case "checksum":
      return checksum(p);
    case "crc":
      return crc(p);
    case "hamming":
      return hamming(p);
  }
}

export function bitControls(op: BitOp): ControlSet {
  switch (op) {
    case "parity":
      return {
        title: "Parity",
        icon: "looks_one",
        controls: [
          { key: "data", label: "Data bits", type: "text", maxLength: 16, pattern: "^[01]{3,16}$" },
          { key: "mode", label: "Parity", type: "chips", options: [{ value: "even", label: "Even" }, { value: "odd", label: "Odd" }] },
          { key: "flips", label: "Bits flipped by noise", type: "chips", options: [0, 1, 2].map((v) => ({ value: v, label: String(v) })), columns: 3 },
        ],
        tryThis: "Flip 2 bits — parity says everything is fine.",
      };
    case "checksum":
      return { title: "Checksum", icon: "functions", controls: [{ key: "words", label: "Bytes (hex)", type: "text", maxLength: 14, pattern: "^([0-9a-fA-F]{1,2}\\s*){2,5}$" }, { key: "flip", label: "Flip bit (-1 = none)", type: "number", min: -1, max: 47 }] };
    case "crc":
      return {
        title: "CRC",
        icon: "calculate",
        controls: [
          { key: "data", label: "Data bits", type: "text", maxLength: 16, pattern: "^[01]{4,16}$" },
          { key: "gen", label: "Generator", type: "text", maxLength: 8, pattern: "^1[01]{2,6}1$", hint: "Starts and ends with 1." },
          { key: "flip", label: "Flip bit (-1 = none)", type: "number", min: -1, max: 22 },
        ],
      };
    case "hamming":
      return { title: "Hamming (7,4)", icon: "healing", controls: [{ key: "data", label: "4 data bits", type: "text", maxLength: 4, pattern: "^[01]{4}$" }, { key: "flip", label: "Flip position (0 = none)", type: "number", min: 0, max: 7 }] };
  }
}
