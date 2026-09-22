import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

export default defineConfig([
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: { "@next/next": nextPlugin },
    rules: nextPlugin.configs["core-web-vitals"].rules,
  },
  // Existing pre-migration files have diagnostics from the newly enabled TS
  // rules; keep their established source untouched in this focused slice.
  { files: ["components/visualizer/SignalCanvas.tsx", "tests/engines.test.mts"], rules: { "@typescript-eslint/no-unused-vars": "off" } },
  { files: ["engines/mediaEngine.ts"], rules: { "prefer-const": "off" } },
  { files: ["lib/mediaStore.ts"], rules: { "@typescript-eslint/no-empty-object-type": "off" } },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
