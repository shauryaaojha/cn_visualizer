// ---------------------------------------------------------------------------
// bitFacts — Inspector cards for one clicked bit on the bit canvas.
// ---------------------------------------------------------------------------

import type { FactSpec } from "./lessonKit.ts";
import type { BitCell, BitRow } from "../types/visualization.ts";

const ROLE: Record<BitCell["role"], string> = {
  data: "A data bit — part of what the sender actually wants to deliver.",
  check: "A check bit — redundancy computed from the data so the receiver can test it.",
  gen: "A generator bit — the fixed divisor both ends agreed on in advance.",
  work: "A working bit in the middle of the calculation.",
  rem: "A remainder / syndrome bit — the result of the check.",
  pad: "An appended zero — room for the CRC to go.",
  sum: "A bit of the running one's-complement sum.",
};

const STATE: Record<BitCell["state"], string> = {
  idle: "—",
  active: "being used in this step",
  flip: "flipped by noise on the wire",
  ok: "checks out",
  bad: "does not check out",
  dim: "already used",
};

export function bitCellFact(row: BitRow, i: number): FactSpec {
  const c = row.cells[i];
  const ones = row.cells.filter((x) => x.v === 1).length;
  return {
    lead: ROLE[c.role],
    rows: [
      ["Row", row.label],
      ["Position", `${i + 1} of ${row.cells.length}${c.tag ? ` (${c.tag})` : ""}`],
      ["Value", String(c.v)],
      ["State", STATE[c.state]],
      ["1s in this row", String(ones)],
      ...(row.note ? ([["Row reads", row.note]] as [string, string][]) : []),
    ],
    remember: "Detection adds redundancy; correction adds enough redundancy to say where the error is.",
  };
}
