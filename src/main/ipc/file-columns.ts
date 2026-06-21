import type { AppStore } from "@main/app-store";
import { FileColumnsUpdate } from "@shared/app-config-schema";
import { IPC } from "@shared/ipc-channels";
import { ipcMain } from "electron";

export function registerFileColumnsHandlers(store: AppStore) {
	ipcMain.handle(IPC.FILE_COLUMNS_GET, () => {
		return store.getFileColumns();
	});

	ipcMain.handle(IPC.FILE_COLUMNS_SET, (_event, update: unknown) => {
		const parsed = FileColumnsUpdate.safeParse(update);
		if (!parsed.success) {
			throw new Error(`Invalid file columns data: ${parsed.error.message}`);
		}
		if (Object.keys(parsed.data).length === 0) {
			throw new Error("Invalid file columns data: update must include at least one field");
		}
		store.setFileColumns(parsed.data);
	});
}
