import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@renderer": resolve("src/renderer"),
      "@shared": resolve("src/shared"),
      "@i18n": resolve("src/i18n"),
    },
  },
  test: {
    environment: "jsdom",
    environmentMatchGlobs: [
      ["src/main/**", "node"],
    ],
    setupFiles: [resolve("src/renderer/test/setup.ts")],
    include: [
      "src/renderer/**/*.{test,spec}.{ts,tsx}",
      "src/main/**/*.{test,spec}.{ts,tsx}",
    ],
    css: { modules: { classNameStrategy: "non-scoped" } },
    globals: true,
  },
});
