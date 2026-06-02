import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist", "node_modules", "public"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // TypeScript's own checker handles undefined identifiers; the core
    // no-undef rule produces false positives for DOM/Web Audio globals.
    files: ["**/*.ts"],
    rules: {
      "no-undef": "off",
    },
  },
  {
    // Node scripts / config files.
    files: ["**/*.mjs", "*.config.{js,ts}", "vite.config.ts"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
      },
    },
  },
);
