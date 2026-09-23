import type { Config } from "tailwindcss";

// --- Chalk & Talk ------------------------------------------------------------
// A green board, chalk, and a teacher who talks you through it.
//
// Structurally identical to the Signal & Wire theme on `main` — same token
// names, same semantic roles — so every component works untouched. What
// changes is the pigment and the handwriting:
//
//   primary  chalk yellow  data / payload / the packet you follow
//   amber    chalk orange  control & decision — ACK pending, routing choice
//   mint     chalk green   success — delivered, converged, checksum OK
//   coral    chalk pink    failure — collision, drop, link down, bit error
//   tertiary chalk blue    the teacher's voice — notes, annotations, asides
//
// Type is a three-way split. Kalam (handwriting) is the teacher at the board —
// headings only, where it has room to be charming. Atkinson Hyperlegible is
// the reading voice — prose, notes, buttons. JetBrains Mono is anything the
// network says — addresses, bits, tables, code, labels.
//
// Scale: 1.25 ratio off a 16px body. Nothing a person needs to read is below
// 12px; the old 9–11px labels were illegible on a laptop and vanished
// entirely in a compressed recording.

const config: Config = {
  darkMode: "class",
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- the board ---
        surface: "#16342A",
        "surface-dim": "#12291F",
        background: "#16342A",
        "surface-container-lowest": "#12291F",
        "surface-container-low": "#1C3E32",
        "surface-container": "#1F4436",
        "surface-container-high": "#26503F",
        "surface-container-highest": "#2C5A47",
        "surface-variant": "#26503F",
        "surface-bright": "#2C5A47",
        "inverse-surface": "#F3F1E7",
        "inverse-on-surface": "#1C3E32",
        "on-background": "#F3F1E7",
        "on-surface": "#F3F1E7",

        // --- chalk yellow: the writing hand ---
        primary: "#F0D264",
        "on-primary": "#16342A",
        "primary-container": "#F0D264",
        "on-primary-container": "#16342A",
        "primary-fixed": "#F7E7A8",
        "primary-fixed-dim": "#F0D264",
        "on-primary-fixed": "#3A2F05",
        "on-primary-fixed-variant": "#6E5A12",
        "inverse-primary": "#6E5A12",
        "surface-tint": "#F0D264",

        // --- chalk dust neutrals ---
        "on-surface-variant": "#9FB3AA",
        outline: "#6E8F82",
        "outline-variant": "#3E5B4E",

        // --- secondary / tertiary ---
        secondary: "#D9DED4",
        "on-secondary": "#1C3E32",
        "secondary-container": "#2C5A47",
        "on-secondary-container": "#D9DED4",
        "secondary-fixed": "#EAEDE6",
        "secondary-fixed-dim": "#D9DED4",
        "on-secondary-fixed": "#12291F",
        "on-secondary-fixed-variant": "#2C5A47",
        tertiary: "#8FCBE0",
        "on-tertiary": "#0B2C38",
        "tertiary-container": "#8FCBE0",
        "on-tertiary-container": "#0B2C38",

        // --- error ---
        error: "#E39AA6",
        "error-container": "#8C4450",
        "on-error": "#16342A",
        "on-error-container": "#F7D6DC",

        // --- semantic accents ---
        signal: "#F0D264", // data / payload
        amber: "#F0A868", // control / decision / pending
        mint: "#B9E39A", // delivered / converged / OK
        coral: "#E39AA6", // collision / drop / link down
        violet: "#C9A8F5", // control plane / protocol
        note: "#8FCBE0", // the teacher's voice
      },
      borderRadius: {
        DEFAULT: "0.375rem",
        lg: "0.625rem",
        xl: "0.875rem",
        full: "9999px",
      },
      spacing: {
        unit: "4px",
        xs: "4px",
        sm: "8px",
        md: "16px",
        gutter: "16px",
        lg: "24px",
        margin: "24px",
        xl: "48px",
      },
      fontFamily: {
        // Handwriting — anything a person says.
        "headline-xl": ["var(--font-kalam)", "Kalam", "cursive"],
        "headline-lg": ["var(--font-kalam)", "Kalam", "cursive"],
        "headline-md": ["var(--font-kalam)", "Kalam", "cursive"],
        "headline-sm": ["var(--font-kalam)", "Kalam", "cursive"],
        "body-lg": ["var(--font-atkinson)", "Atkinson Hyperlegible Next", "system-ui", "sans-serif"],
        "body-md": ["var(--font-atkinson)", "Atkinson Hyperlegible Next", "system-ui", "sans-serif"],
        "body-sm": ["var(--font-atkinson)", "Atkinson Hyperlegible Next", "system-ui", "sans-serif"],
        hand: ["var(--font-kalam)", "Kalam", "cursive"],
        // The reading voice — prose, notes, buttons.
        sans: ["var(--font-atkinson)", "Atkinson Hyperlegible Next", "system-ui", "sans-serif"],
        // Machine type — anything the network says.
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
        "label-caps": ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
        "code-snippet": ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
      },
      fontSize: {
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "1.55", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "label-caps": ["12px", { lineHeight: "1.2", letterSpacing: "0.08em", fontWeight: "600" }],
        "code-snippet": ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        "headline-xl": ["clamp(44px, 6vw, 76px)", { lineHeight: "1.02", fontWeight: "700", letterSpacing: "-0.01em" }],
        "headline-lg": ["40px", { lineHeight: "1.1", fontWeight: "700" }],
        "headline-md": ["28px", { lineHeight: "1.2", fontWeight: "700" }],
        "headline-sm": ["21px", { lineHeight: "1.3", fontWeight: "700" }],
      },
    },
  },
  plugins: [],
};
export default config;
