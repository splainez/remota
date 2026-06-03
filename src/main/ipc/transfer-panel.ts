import type { AppStore } from "@main/app-store";
import { TransferPanelUpdate } from "@shared/app-config-schema";
import { IPC } from "@shared/ipc-channels";
import { ipcMain } from "electron";

export function registerTransferPanelHandlers(store: AppStore) {
	ipcMain.handle(IPC.TRANSFER_PANEL_GET_ALL, () => {
		return store.getAllTransferPanels();
	});

	ipcMain.handle(IPC.TRANSFER_PANEL_SET, (_event, connectionId: number, update: unknown) => {
		const parsed = TransferPanelUpdate.safeParse(update);
		if (!parsed.success) {
			throw new Error(`Invalid transfer panel data: ${parsed.error.message}`);
		}
		if (Object.keys(parsed.data).length === 0) {
			throw new Error("Invalid transfer panel data: update must include at least one field");
		}
		store.setTransferPanel(connectionId, parsed.data);
	});
}
