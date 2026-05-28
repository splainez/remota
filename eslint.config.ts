// @ts-check
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
	{
		ignores: ["coverage/**", "out/**", "dist/**", "node_modules/**"],
	},
	js.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	reactHooks.configs.flat.recommended,
	reactRefresh.configs.vite,
	{
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ["eslint.config.js", "vitest.config.js"],
				},
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"react-hooks/set-state-in-effect": "warn",
			"@typescript-eslint/consistent-type-exports": "error",
			"@typescript-eslint/consistent-type-imports": "error",
		},
	},
);
