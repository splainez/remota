import type { AppStore } from "@main/app-store";
import { FilePaneSizeUpdate } from "@shared/app-config-schema";
import { IPC } from "@shared/ipc-channels";
import { ipcMain } from "electron";

export function registerFilePaneSizeHandlers(store: AppStore) {
	ipcMain.handle(IPC.FILE_PANE_SIZE_GET_ALL, () => {
		return store.getAllFilePaneSizes();
	});

	ipcMain.handle(IPC.FILE_PANE_SIZE_SET, (_event, connectionId: number, update: unknown) => {
		const parsed = FilePaneSizeUpdate.safeParse(update);
		if (!parsed.success) {
			throw new Error(`Invalid file pane size data: ${parsed.error.message}`);
		}
		if (Object.keys(parsed.data).length === 0) {
			throw new Error("Invalid file pane size data: update must include at least one field");
		}
		store.setFilePaneSize(connectionId, parsed.data);
	});
}
