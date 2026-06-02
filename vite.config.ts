import { defineConfig } from "vite";

// Minimal ambient declaration to avoid depending on @types/node.
declare const process: { env: Record<string, string | undefined> };

// GitHub Pages project page is served under /workout-timer/.
// Allow override via BASE_PATH so the same build works for custom hosting.
const base = process.env.BASE_PATH ?? "/workout-timer/";

export default defineConfig({
  base,
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
