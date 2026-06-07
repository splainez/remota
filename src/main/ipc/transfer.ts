import { stat } from "node:fs/promises";

import type { RemoteEditManager } from "@main/remote-edit/remote-edit-manager";
import type { TransferService } from "@main/transfer/transfer-service";
import { IPC } from "@shared/ipc-channels";
import type { LocalStat } from "@shared/transfer-types";
import { DownloadRequestSchema, UploadRequestSchema } from "@shared/transfer-types";
import { ipcMain } from "electron";

export function registerTransferHandlers(
	service: TransferService,
	getWebContents: () => Electron.WebContents | null,
	remoteEditManager: RemoteEditManager,
) {
	ipcMain.handle(IPC.FILE_GET_LOCAL_STAT, async (_event, path: string): Promise<LocalStat | null> => {
		try {
			const stats = await stat(path);
			return {
				exists: true,
				size: stats.size,
				modified: stats.mtime.toISOString(),
				isDirectory: stats.isDirectory(),
			};
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === "ENOENT") {
				return { exists: false, size: 0, modified: "", isDirectory: false };
			}
			throw err;
		}
	});

	ipcMain.handle(IPC.FILE_DOWNLOAD, (_event, request: unknown) => {
		const parsed = DownloadRequestSchema.safeParse(request);
		if (!parsed.success) {
			throw new Error(`Invalid download request: ${parsed.error.message}`);
		}
		const wc = getWebContents();
		if (!wc) {
			throw new Error("No active window to send transfer progress");
		}
		return service.startDownload(parsed.data, wc);
	});

	ipcMain.handle(IPC.FILE_UPLOAD, (_event, request: unknown) => {
		const parsed = UploadRequestSchema.safeParse(request);
		if (!parsed.success) {
			throw new Error(`Invalid upload request: ${parsed.error.message}`);
		}
		const wc = getWebContents();
		if (!wc) {
			throw new Error("No active window to send transfer progress");
		}
		return service.startUpload(parsed.data, wc);
	});

	ipcMain.handle(IPC.TRANSFER_CANCEL, (_event, jobId: string, itemId: string) => {
		service.cancelItem(jobId, itemId);
		remoteEditManager.cancelUpload(itemId);
		remoteEditManager.cancelDownload(itemId);
	});

	ipcMain.handle(IPC.TRANSFER_CANCEL_ALL, () => {
		service.cancelAll();
		remoteEditManager.cancelAllUploads();
		remoteEditManager.cancelAllDownloads();
	});

	ipcMain.handle(IPC.TRANSFER_CANCEL_BY_CONNECTION, (_event, connectionId: number) => {
		service.cancelByConnectionId(connectionId);
		remoteEditManager.stopAllForConnection(connectionId);
	});
}
