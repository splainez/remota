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
	clearPendingRecoveryToast: () => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
	theme: "system",
	locale: "en",
	externalTerminal: undefined,
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

	clearPendingRecoveryToast: () => {
		set({ pendingRecoveryToast: null });
	},
}));
