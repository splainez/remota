import { resolve } from "node:path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	main: {
		build: {
			externalizeDeps: true,
		},
	},
	preload: {
		build: {
			externalizeDeps: true,
		},
	},
	renderer: {
		plugins: [react()],
		root: resolve("src/renderer"),
		build: {
			rollupOptions: {
				input: resolve("src/renderer/index.html"),
			},
		},
	},
});
