import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
	resolve: {
		alias: {
			"@shared": resolve("src/shared"),
			"@i18n": resolve("src/i18n"),
		},
	},
	test: {
		name: "integration",
		environment: "node",
		include: ["tests/integration/**/*.test.ts"],
		exclude: ["tests/integration/containers/**"],
		globalSetup: ["./tests/integration/vitest-global-setup.ts"],
		testTimeout: 120_000,
		hookTimeout: 120_000,
		globals: true,
	},
});
