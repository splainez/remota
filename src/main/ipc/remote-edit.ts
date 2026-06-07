import type { RemoteEditManager } from "@main/remote-edit/remote-edit-manager";
import { IPC } from "@shared/ipc-channels";
import { ipcMain } from "electron";
import { z } from "zod";

const startParamsSchema = z.object({
	connectionId: z.number(),
	remotePath: z.string().min(1),
});

const stopParamsSchema = z.object({
	connectionId: z.number(),
	remotePath: z.string().min(1),
});

export function registerRemoteEditHandlers(manager: RemoteEditManager): void {
	ipcMain.handle(IPC.REMOTE_EDIT_START, async (_event, connectionId: number, remotePath: string) => {
		const parsed = startParamsSchema.safeParse({ connectionId, remotePath });
		if (!parsed.success) {
			throw new Error(`Invalid remote edit params: ${parsed.error.message}`);
		}
		return manager.startEdit(parsed.data.connectionId, parsed.data.remotePath);
	});

	ipcMain.handle(IPC.REMOTE_EDIT_STOP, (_event, connectionId: number, remotePath: string) => {
		const parsed = stopParamsSchema.safeParse({ connectionId, remotePath });
		if (!parsed.success) {
			throw new Error(`Invalid remote edit params: ${parsed.error.message}`);
		}
		manager.stopEdit(parsed.data.connectionId, parsed.data.remotePath);
	});
}
