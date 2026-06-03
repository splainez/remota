import { create } from "zustand";
import { LoggerFactory } from "../../shared/lib/logger";
import type { Settings } from "../../shared/types";

const logger = LoggerFactory.init({ name: 'renderer.store.settings' });

interface SettingsStore {
	theme: Settings["theme"];
	locale: Settings["locale"];
	loaded: boolean;
	load: () => Promise<void>;
	setTheme: (theme: Settings["theme"]) => void;
	setLocale: (locale: Settings["locale"]) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
	theme: "system",
	locale: "en",
	loaded: false,

	load: async () => {
		try {
			const settings = await window.api.settings.getAll();
			set({
				theme: settings.theme,
				locale: settings.locale,
				loaded: true,
			});
		} catch {
			set({ loaded: true });
		}
	},

	setTheme: (theme) => {
		set({ theme });
		window.api.settings.set({ theme })
			.catch((error: unknown) => {
				logger.error("setTheme error", { error });
			});
	},

	setLocale: (locale) => {
		set({ locale });
		window.api.settings.set({ locale })
			.catch((error: unknown) => {
				logger.error("setLocale error", { error });
			});
	},
}));
