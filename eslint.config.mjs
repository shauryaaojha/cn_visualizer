// Flat ESLint config.
//
// Next 16 dropped `next lint`, so `npm run lint` now calls eslint directly and
// the config moved here from .eslintrc.json. The presets come from
// eslint-config-next, which is already a devDependency — nothing new installed.
//
// The per-file blocks below are scoped suppressions for code written before
// these rules were switched on. They are deliberately narrow: a blanket "off"
// would hide the same mistake in new code.

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: { react: { version: "19.2.7" } },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Two deliberate setState-in-effect patterns. FitStage measures its own
  // content and stores the scale, driven by a ResizeObserver. Field's text
  // inputs hold a local draft and resync when the committed prop changes —
  // see that file's header for why committing per keystroke is wrong here.
  {
    files: ["components/visualizer/FitStage.tsx", "components/ui/Field.tsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  { files: ["lib/mediaStore.ts"], rules: { "@typescript-eslint/no-empty-object-type": "off" } },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
