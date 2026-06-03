import { ipcMain } from "electron";
import { IPC } from "@shared/ipc-channels";
import { SettingsSchema } from "@shared/app-config-schema";
import type { SettingsUpdate } from "@shared/app-config-schema";
import type { AppStore } from "@main/app-store";

export function registerSettingsHandlers(store: AppStore) {
	ipcMain.handle(IPC.SETTINGS_GET_ALL, () => {
		return store.getSettings();
	});

	ipcMain.handle(IPC.SETTINGS_SET, (_event, update: SettingsUpdate) => {
		const parsed = SettingsSchema.partial().safeParse(update);
		if (!parsed.success) {
			throw new Error(`Invalid settings data: ${parsed.error.message}`);
		}
		return store.setSettings(parsed.data);
	});
}
