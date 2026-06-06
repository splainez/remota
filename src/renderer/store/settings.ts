import {
	MAX_PARALLEL_TRANSFERS_DEFAULT,
	MAX_PARALLEL_TRANSFERS_MAX,
	MAX_PARALLEL_TRANSFERS_MIN,
	RETENTION_MS_MAX,
	RETENTION_MS_MIN,
} from "@shared/app-config-schema";
import { LoggerFactory } from "@shared/lib/logger";
import type { Settings, TerminalAppId } from "@shared/types";
import { create } from "zustand";

const logger = LoggerFactory.init({ name: "renderer.store.settings" });

interface SettingsStore extends Settings {
	loaded: boolean;
	availableTerminals: TerminalAppId[];
	pendingRecoveryToast: TerminalAppId | null;
	load: () => Promise<void>;
	setTheme: (theme: Settings["theme"]) => void;
	setLocale: (locale: Settings["locale"]) => void;
	setExternalTerminal: (terminal: Settings["externalTerminal"]) => void;
	setMaxParallelTransfers: (value: number) => void;
	setRetentionMs: (ms: number | undefined) => void;
	clearPendingRecoveryToast: () => void;
}

function clampParallel(value: number): number {
	if (!Number.isFinite(value)) return MAX_PARALLEL_TRANSFERS_DEFAULT;
	if (value < MAX_PARALLEL_TRANSFERS_MIN) return MAX_PARALLEL_TRANSFERS_MIN;
	if (value > MAX_PARALLEL_TRANSFERS_MAX) return MAX_PARALLEL_TRANSFERS_MAX;
	return Math.floor(value);
}

function clampRetention(value: number | undefined): number | undefined {
	if (value === undefined) return undefined;
	if (!Number.isFinite(value)) return undefined;
	if (value < RETENTION_MS_MIN) return RETENTION_MS_MIN;
	if (value > RETENTION_MS_MAX) return RETENTION_MS_MAX;
	return Math.floor(value);
}

export const useSettingsStore = create<SettingsStore>((set) => ({
	theme: "system",
	locale: "en",
	externalTerminal: undefined,
	maxParallelTransfers: MAX_PARALLEL_TRANSFERS_DEFAULT,
	retentionMs: undefined,
	loaded: false,
	availableTerminals: [],
	pendingRecoveryToast: null,

	load: async () => {
		try {
			const [settings, available] = await Promise.all([
				window.api.settings.getAll(),
				window.api.terminal.detectInstalled().catch((error: unknown) => {
					logger.error("detectInstalled failed", { error });
					return [] as TerminalAppId[];
				}),
			]);

			const availableSet = new Set(available);
			const needsRecovery = Boolean(settings.externalTerminal && !availableSet.has(settings.externalTerminal));
			const recoveredId = needsRecovery ? (settings.externalTerminal ?? null) : null;

			if (needsRecovery) {
				window.api.settings.set({ externalTerminal: undefined }).catch((error: unknown) => {
					logger.error("Failed to persist externalTerminal reset", { error });
				});
			}

			set({
				theme: settings.theme,
				locale: settings.locale,
				externalTerminal: needsRecovery ? undefined : settings.externalTerminal,
				maxParallelTransfers: clampParallel(settings.maxParallelTransfers),
				retentionMs: clampRetention(settings.retentionMs),
				availableTerminals: available,
				pendingRecoveryToast: recoveredId,
				loaded: true,
			});
		} catch (error: unknown) {
			logger.error("load failed; booting with defaults", { error });
			set({ loaded: true });
		}
	},

	setTheme: (theme) => {
		set({ theme });
		window.api.settings.set({ theme }).catch((error: unknown) => {
			logger.error("setTheme error", { error });
		});
	},

	setLocale: (locale) => {
		set({ locale });
		window.api.settings.set({ locale }).catch((error: unknown) => {
			logger.error("setLocale error", { error });
		});
	},

	setExternalTerminal: (terminal) => {
		set({ externalTerminal: terminal });
		window.api.settings.set({ externalTerminal: terminal }).catch((error: unknown) => {
			logger.error("setExternalTerminal error", { error });
		});
	},

	setMaxParallelTransfers: (value) => {
		const clamped = clampParallel(value);
		set({ maxParallelTransfers: clamped });
		window.api.settings.set({ maxParallelTransfers: clamped }).catch((error: unknown) => {
			logger.error("setMaxParallelTransfers error", { error });
		});
	},

	setRetentionMs: (ms) => {
		const clamped = clampRetention(ms);
		set({ retentionMs: clamped });
		window.api.settings.set({ retentionMs: clamped }).catch((error: unknown) => {
			logger.error("setRetentionMs error", { error });
		});
	},

	clearPendingRecoveryToast: () => {
		set({ pendingRecoveryToast: null });
	},
}));
