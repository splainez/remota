import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

export default defineConfig({
	main: {
		build: {
			externalizeDeps: true,
		},
		resolve: {
			alias: {
				"@main": resolve("src/main"),
				"@shared": resolve("src/shared"),
				"@i18n": resolve("src/i18n"),
			},
		},
	},
	preload: {
		build: {
			externalizeDeps: true,
		},
		resolve: {
			alias: {
				"@shared": resolve("src/shared"),
				"@i18n": resolve("src/i18n"),
			},
		},
	},
	renderer: {
		plugins: [react(), tailwindcss()],
		root: resolve("src/renderer"),
		build: {
			rollupOptions: {
				input: resolve("src/renderer/index.html"),
			},
		},
		resolve: {
			alias: {
				"@renderer": resolve("src/renderer"),
				"@shared": resolve("src/shared"),
				"@i18n": resolve("src/i18n"),
			},
		},
	},
});
