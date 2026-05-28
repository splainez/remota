import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
	root: resolve("src/renderer"),
	plugins: [react(), tailwindcss()],
	server: {
		port: 5174,
	},
});
