import { defineConfig } from "oxfmt";

export default defineConfig({
	printWidth: 120,
	ignorePatterns: [".agents/skills/**", "desing/**"],
	sortImports: true,
});
