import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@renderer": resolve("src/renderer"),
			"@shared": resolve("src/shared"),
			"@i18n": resolve("src/i18n"),
		},
	},
	test: {
		environment: "jsdom",
		environmentMatchGlobs: [["src/main/**", "node"]],
		setupFiles: [resolve("src/renderer/test/setup.ts")],
		include: [
			"src/renderer/**/*.{test,spec}.{ts,tsx}",
			"src/main/**/*.{test,spec}.{ts,tsx}",
			"src/shared/**/*.{test,spec}.{ts,tsx}",
		],
		css: { modules: { classNameStrategy: "non-scoped" } },
		globals: true,
	},
});
