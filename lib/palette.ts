// ---------------------------------------------------------------------------
// Chalk & Talk — the raw hexes.
//
// Tailwind classes cover most of the UI, but SVG strokes, gradients and
// canvas-drawn fills need literal colors. Those all come from here, so a theme
// swap is this file plus tailwind.config.ts and nothing else.
//
// The semantic roles are unchanged from Signal & Wire — only the pigments are.
// Chalk on a green board can't do saturated cyan, but it does yellow, orange,
// green and pink beautifully, and vis.html already proved pink reads as
// "something went wrong" without a caption.
// ---------------------------------------------------------------------------

export const PALETTE = {
  /** Data / payload / the packet you are following. */
  data: "#F0D264",
  /** Control & decision — ACK pending, routing choice, the token. */
  control: "#F0A868",
  /** Success — delivered, converged, checksum OK. */
  ok: "#B9E39A",
  /** Failure — collision, drop, link down, bit error. */
  fail: "#E39AA6",
  /** The teacher's voice: annotations, notes, asides. */
  note: "#8FCBE0",
  /** Control plane / protocol messages (Units 3–5). */
  protocol: "#C9A8F5",

  /** An idle wire — chalk drawn faintly, not a bright line. */
  wire: "#6E8F82",
  /** The board itself, for punching holes through a drawn line. */
  board: "#16342A",
  boardDeep: "#12291F",
  chalk: "#F3F1E7",
  muted: "#9FB3AA",
} as const;

/** Extra hues for VLSM-style multi-block diagrams (Unit 2 onward). */
export const CHALK_SERIES = [
  "#F0D264",
  "#8FCBE0",
  "#E39AA6",
  "#B9E39A",
  "#C9A8F5",
  "#F0A868",
  "#7FE0C9",
];
