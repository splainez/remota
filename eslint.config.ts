import importAlias from "@dword-design/eslint-plugin-import-alias";
// @ts-check
import js from "@eslint/js";
import eslintPluginBetterTailwindcss from "eslint-plugin-better-tailwindcss";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
	{
		ignores: ["coverage/**", "out/**", "dist/**", "node_modules/**"],
	},
	importAlias.configs.recommended,
	js.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	reactPlugin.configs.flat.recommended,
	reactPlugin.configs.flat["jsx-runtime"],
	reactHooks.configs.flat.recommended,
	reactRefresh.configs.vite,
	eslintPluginBetterTailwindcss.configs["recommended-error"],
	{
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ["eslint.config.js", "vitest.config.js"],
				},
				tsconfigRootDir: import.meta.dirname,
			},
		},
		settings: {
			"better-tailwindcss": {
				cwd: "./src/renderer",
				entryPoint: "./src/renderer/global.css",
			},
			react: {
				version: "19",
			},
		},
		rules: {
			"react-hooks/set-state-in-effect": "warn",
			"@typescript-eslint/consistent-type-exports": "error",
			"@typescript-eslint/consistent-type-imports": "error",
			"better-tailwindcss/enforce-consistent-variant-order": "error",
			"better-tailwindcss/enforce-consistent-variable-syntax": "error",
			"better-tailwindcss/enforce-consistent-important-position": "error",
			"better-tailwindcss/enforce-shorthand-classes": "error",
			"better-tailwindcss/enforce-consistent-line-wrapping": [
				"error",
				{
					printWidth: 120,
					indent: "tab",
					tabWidth: 2,
					lineBreakStyle: "unix",
					preferSingleLine: true,
				},
			],
		},
	},
);
