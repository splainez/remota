import { create } from "zustand";
import { setLocale as setI18nLocale } from "../../i18n";
import type { Settings } from "../../shared/types";

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
		void window.api.settings.set({ theme });
	},

	setLocale: (locale) => {
		set({ locale });
		setI18nLocale(locale);
		void window.api.settings.set({ locale });
	},
}));
