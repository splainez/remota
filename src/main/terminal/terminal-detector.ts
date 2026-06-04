import { execFile } from "node:child_process";
import { existsSync } from "node:fs";

import { TERMINAL_APP_IDS, type TerminalAppId } from "@shared/app-config-schema";

const PLATFORM_AVAILABILITY: Record<TerminalAppId, NodeJS.Platform[]> = {
	"windows-terminal": ["win32"],
	kitty: ["linux", "darwin"],
	ghostty: ["linux", "darwin"],
	alacritty: ["linux", "darwin", "win32"],
	iterm2: ["darwin"],
	"terminal-app": ["darwin"],
	"gnome-terminal": ["linux"],
	konsole: ["linux"],
};

const COMMAND_BINS: Record<TerminalAppId, string[]> = {
	"windows-terminal": ["wt.exe"],
	kitty: ["kitty"],
	ghostty: ["ghostty"],
	alacritty: ["alacritty"],
	iterm2: [],
	"terminal-app": [],
	"gnome-terminal": ["gnome-terminal"],
	konsole: ["konsole"],
};

const ABSOLUTE_PATHS: Record<TerminalAppId, string[]> = {
	"windows-terminal": [],
	kitty: [],
	ghostty: [],
	alacritty: [],
	iterm2: ["/Applications/iTerm.app", "/Applications/iTerm2.app"],
	"terminal-app": ["/System/Applications/Utilities/Terminal.app", "/Applications/Utilities/Terminal.app"],
	"gnome-terminal": [],
	konsole: [],
};

const LOOKUP_TIMEOUT_MS = 2000;

export interface DetectorDeps {
	platform: NodeJS.Platform;
	lookupCommand: (command: string) => Promise<boolean>;
	existsSync: (path: string) => boolean;
}

const DEFAULT_DEPS: DetectorDeps = {
	platform: process.platform,
	lookupCommand: createDefaultLookupCommand(process.platform),
	existsSync,
};

export async function detectInstalledTerminals(deps: DetectorDeps = DEFAULT_DEPS): Promise<TerminalAppId[]> {
	const candidates = TERMINAL_APP_IDS.filter((id) => PLATFORM_AVAILABILITY[id].includes(deps.platform));

	const results = await Promise.all(
		candidates.map(async (id) => {
			const bins = COMMAND_BINS[id];
			if (bins.length > 0) {
				const lookups = await Promise.all(bins.map((bin) => deps.lookupCommand(bin).catch(() => false)));
				if (lookups.some(Boolean)) return id;
				return null;
			}

			const absPaths = ABSOLUTE_PATHS[id];
			if (absPaths.length > 0 && absPaths.some((p) => deps.existsSync(p))) {
				return id;
			}
			return null;
		}),
	);

	return results.filter((id): id is TerminalAppId => id !== null);
}

function createDefaultLookupCommand(platform: NodeJS.Platform) {
	const lookupBin = platform === "win32" ? "where.exe" : "which";
	return async (command: string): Promise<boolean> => {
		try {
			await new Promise<void>((resolve, reject) => {
				execFile(lookupBin, [command], { timeout: LOOKUP_TIMEOUT_MS, windowsHide: true }, (error) => {
					if (error) reject(new Error(error.message));
					else resolve();
				});
			});
			return true;
		} catch {
			return false;
		}
	};
}
