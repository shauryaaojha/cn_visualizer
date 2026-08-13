import type { Config } from "tailwindcss";

// --- Signal & Wire -----------------------------------------------------------
// Same neutral dark Material-3 surface ramp as DSA-VISUALISER's Ember & Coral,
// so all ported chrome works untouched — but the accents are re-assigned for
// what a network actually needs to color-code:
//
//   signal / primary  cyan   data, payload, the packet you are following
//   amber             amber  control & decision — ACK pending, routing choice
//   mint              green  success — delivered, converged, checksum OK
//   coral             red    failure — collision, drop, link down, bit error
//   violet            purple control plane / protocol messages (U3–U5)
//
// Coral demoting from *primary* to *the failure color* is the whole trick: a
// broken network is legible at a glance, and CN reads as a sibling of DSA
// rather than a reskin.

const config: Config = {
  darkMode: "class",
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- neutral surface ramp (identical to DSA) ---
        surface: "#131313",
        "surface-dim": "#131313",
        background: "#131313",
        "surface-container-lowest": "#0e0e0e",
        "surface-container-low": "#1c1b1b",
        "surface-container": "#201f1f",
        "surface-container-high": "#2a2a2a",
        "surface-container-highest": "#353534",
        "surface-variant": "#353534",
        "surface-bright": "#393939",
        "inverse-surface": "#e5e2e1",
        "inverse-on-surface": "#313030",
        "on-background": "#e5e2e1",
        "on-surface": "#e5e2e1",

        // --- cyan primary (was coral) ---
        primary: "#22D3EE",
        "on-primary": "#00363F",
        "primary-container": "#06B6D4",
        "on-primary-container": "#00323A",
        "primary-fixed": "#B5ECF7",
        "primary-fixed-dim": "#22D3EE",
        "on-primary-fixed": "#001F25",
        "on-primary-fixed-variant": "#00505E",
        "inverse-primary": "#00687A",
        "surface-tint": "#22D3EE",

        // --- cool-tinted neutrals (was warm brown) ---
        "on-surface-variant": "#B9D5DB",
        outline: "#7F9BA3",
        "outline-variant": "#2F4A52",

        // --- secondary / tertiary ---
        secondary: "#C6C6C7",
        "on-secondary": "#2F3131",
        "secondary-container": "#454747",
        "on-secondary-container": "#B4B5B5",
        "secondary-fixed": "#E2E2E2",
        "secondary-fixed-dim": "#C6C6C7",
        "on-secondary-fixed": "#1A1C1C",
        "on-secondary-fixed-variant": "#454747",
        tertiary: "#A78BFA",
        "on-tertiary": "#2E1065",
        "tertiary-container": "#7C3AED",
        "on-tertiary-container": "#EDE9FE",

        // --- error ---
        error: "#FFB4AB",
        "error-container": "#93000A",
        "on-error": "#690005",
        "on-error-container": "#FFDAD6",

        // --- semantic accents (match the shader orbs) ---
        signal: "#22D3EE", // data / payload
        amber: "#F5A623", // control / decision / pending
        mint: "#34C98A", // delivered / converged / OK
        coral: "#FF5F4A", // collision / drop / link down
        violet: "#A78BFA", // control plane / protocol
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
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
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
        "body-lg": ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
        "label-caps": ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
        "code-snippet": ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
        "body-md": ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
        "headline-xl": ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
        "headline-lg": ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
        "headline-md": ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
        "headline-sm": ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
        "body-sm": ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
      },
      fontSize: {
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "label-caps": ["11px", { lineHeight: "1.0", letterSpacing: "0.1em", fontWeight: "700" }],
        "code-snippet": ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "1.4", fontWeight: "400" }],
        "headline-xl": ["40px", { lineHeight: "1.1", letterSpacing: "-0.04em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "headline-sm": ["18px", { lineHeight: "1.3", fontWeight: "600" }],
      },
    },
  },
  plugins: [],
};
export default config;
