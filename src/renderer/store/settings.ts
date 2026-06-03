import { LoggerFactory } from "@shared/lib/logger";
import type { Settings } from "@shared/types";
import { create } from "zustand";

const logger = LoggerFactory.init({ name: "renderer.store.settings" });

interface SettingsStore extends Settings {
	loaded: boolean;
	load: () => Promise<void>;
	setTheme: (theme: Settings["theme"]) => void;
	setLocale: (locale: Settings["locale"]) => void;
	setExternalTerminal: (terminal: Settings["externalTerminal"]) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
	theme: "system",
	locale: "en",
	externalTerminal: undefined,
	loaded: false,

	load: async () => {
		try {
			const settings = await window.api.settings.getAll();
			set({
				theme: settings.theme,
				locale: settings.locale,
				externalTerminal: settings.externalTerminal,
				loaded: true,
			});
		} catch {
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
}));
