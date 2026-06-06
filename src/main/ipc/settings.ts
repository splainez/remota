import type { AppStore } from "@main/app-store";
import type { TransferService } from "@main/transfer/transfer-service";
import { MAX_PARALLEL_TRANSFERS_MAX, MAX_PARALLEL_TRANSFERS_MIN, SettingsSchema } from "@shared/app-config-schema";
import type { SettingsUpdate } from "@shared/app-config-schema";
import { IPC } from "@shared/ipc-channels";
import { ipcMain } from "electron";

function clampParallel(value: number): number {
	if (!Number.isFinite(value) || value < MAX_PARALLEL_TRANSFERS_MIN) return MAX_PARALLEL_TRANSFERS_MIN;
	if (value > MAX_PARALLEL_TRANSFERS_MAX) return MAX_PARALLEL_TRANSFERS_MAX;
	return Math.floor(value);
}

export function registerSettingsHandlers(store: AppStore, transferService?: TransferService) {
	ipcMain.handle(IPC.SETTINGS_GET_ALL, () => {
		return store.getSettings();
	});

	ipcMain.handle(IPC.SETTINGS_SET, (_event, update: SettingsUpdate) => {
		const parsed = SettingsSchema.partial().safeParse(update);
		if (!parsed.success) {
			throw new Error(`Invalid settings data: ${parsed.error.message}`);
		}
		const result = store.setSettings(parsed.data);
		if (transferService && "maxParallelTransfers" in parsed.data) {
			transferService.setConcurrency(clampParallel(result.maxParallelTransfers));
		}
		return result;
	});
}
