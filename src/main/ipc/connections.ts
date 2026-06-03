import type { AppStore } from "@main/app-store";
import { IPC } from "@shared/ipc-channels";
import type { NewConnection, ConnectionUpdate } from "@shared/types";
import { connectionFormSchema, connectionBaseSchema } from "@shared/validation";
import { ipcMain } from "electron";

export function registerConnectionHandlers(store: AppStore) {
	ipcMain.handle(IPC.CONNECTION_LIST, () => {
		return store.list();
	});

	ipcMain.handle(IPC.CONNECTION_GET, (_event, id: number) => {
		return store.get(id) ?? null;
	});

	ipcMain.handle(IPC.CONNECTION_CREATE, (_event, data: NewConnection) => {
		const parsed = connectionFormSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error(`Invalid connection data: ${parsed.error.message}`);
		}
		return store.create(parsed.data);
	});

	ipcMain.handle(IPC.CONNECTION_UPDATE, (_event, data: ConnectionUpdate) => {
		const partialSchema = connectionBaseSchema.partial();
		const parsed = partialSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error(`Invalid connection data: ${parsed.error.message}`);
		}
		const { id, ...fields } = data;
		return store.update(id, fields) ?? null;
	});

	ipcMain.handle(IPC.CONNECTION_DELETE, (_event, id: number) => {
		return store.delete(id);
	});
}
