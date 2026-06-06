import { readdirSync, renameSync, statSync, existsSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, sep } from "node:path";

import type { AppStore } from "@main/app-store";
import type { FileWatcherManager } from "@main/file-watcher/file-watcher-manager";
import { tempManager } from "@main/temp/temp-manager";
import { IPC } from "@shared/ipc-channels";
import { LoggerFactory } from "@shared/lib/logger";
import type { FileEntry } from "@shared/types";
import { renameParamsSchema } from "@shared/validation";
import { app, ipcMain, shell } from "electron";

const logger = LoggerFactory.init({ name: "main.ipc.filesystem" });

export function listDirectory(dirPath: string): FileEntry[] {
	let entryNames: string[];
	try {
		entryNames = readdirSync(dirPath);
	} catch {
		return [];
	}

	const entries: FileEntry[] = [];

	for (const name of entryNames) {
		const fullPath = join(dirPath, name);
		try {
			const stats = statSync(fullPath);
			entries.push({
				name,
				fullPath,
				isDirectory: stats.isDirectory(),
				size: stats.isFile() ? stats.size : 0,
				modified: stats.mtime.toISOString(),
			});
		} catch {
			entries.push({ name, fullPath, isDirectory: false, size: 0, modified: "" });
		}
	}

	return entries;
}

export function normalizePath(input: string): string {
	if (/^[a-zA-Z]:\\$/.test(input)) return input;
	if (input.endsWith(sep) && input.length > sep.length) {
		return input.slice(0, -sep.length);
	}
	return input;
}

export function listDrives(): string[] {
	if (process.platform !== "win32") return ["/"];
	const drives: string[] = [];
	for (let i = 65; i <= 90; i++) {
		const letter = String.fromCharCode(i);
		const path = `${letter}:\\`;
		try {
			if (existsSync(path)) {
				drives.push(path);
			}
		} catch {
			// Skip inaccessible drives
		}
	}
	return drives;
}

export function registerFilesystemHandlers(store: AppStore, fileWatcher: FileWatcherManager) {
	ipcMain.handle(IPC.FILE_LIST, (_event, dirPath: string) => {
		const normalized = normalizePath(dirPath);
		return listDirectory(normalized);
	});

	ipcMain.handle(IPC.FILE_LIST_DRIVES, () => {
		return listDrives();
	});

	ipcMain.handle(IPC.FILE_HOME_DIR, () => {
		return homedir();
	});

	ipcMain.handle(IPC.FILE_PATH_EXISTS, (_event, dirPath: string) => {
		return existsSync(dirPath);
	});

	ipcMain.handle(IPC.FILE_GET_ICON, async (_event, filePath: string) => {
		try {
			const icon = await app.getFileIcon(filePath, { size: "small" });
			return icon.isEmpty() ? null : icon.toDataURL();
		} catch {
			return null;
		}
	});

	ipcMain.handle(IPC.FILE_GET_LAST_PATH, (_event, connectionId: number, pane: "local" | "remote") => {
		if (pane === "local") {
			return store.getLocalPath(connectionId) ?? null;
		}
		return store.getRemotePath(connectionId) ?? null;
	});

	ipcMain.handle(IPC.FILE_SET_LAST_PATH, (_event, connectionId: number, pane: "local" | "remote", path: string) => {
		if (pane === "local") {
			store.setLocalPath(connectionId, path);
		} else {
			store.setRemotePath(connectionId, path);
		}
	});

	ipcMain.handle(IPC.FILE_OPEN_PATH, (_event, filePath: string) => {
		return openPath(filePath);
	});

	ipcMain.handle(IPC.FILE_RENAME, (_event, oldPath: string, newName: string) => {
		const parsed = renameParamsSchema.safeParse({ oldPath, newName });
		if (!parsed.success) {
			throw new Error(`Invalid rename params: ${parsed.error.message}`);
		}
		const newPath = join(dirname(parsed.data.oldPath), parsed.data.newName);
		try {
			renameSync(parsed.data.oldPath, newPath);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			logger.error("rename failed", { oldPath: parsed.data.oldPath, newName: parsed.data.newName, error: message });
			throw new Error(`Rename failed: ${message}`, { cause: err });
		}
	});

	ipcMain.handle(IPC.FILE_DELETE, (_event, filePath: string) => {
		try {
			rmSync(filePath, { recursive: true, force: true });
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			logger.error("delete failed", { path: filePath, error: message });
			throw new Error(`Delete failed: ${message}`, { cause: err });
		}
	});

	ipcMain.handle(IPC.FILE_TEMP_GET_PATH, (_event, connectionId: number) => {
		return tempManager.getTempPath(connectionId);
	});

	ipcMain.handle(IPC.FILE_TEMP_WRITE, async (_event, connectionId: number, remotePath: string, content: number[]) => {
		await tempManager.writeFile(connectionId, remotePath, Buffer.from(content));
	});

	ipcMain.handle(IPC.FILE_TEMP_READ, async (_event, connectionId: number, remotePath: string) => {
		const buffer = await tempManager.readFile(connectionId, remotePath);
		return [...buffer];
	});

	ipcMain.handle(IPC.FILE_TEMP_MKDIR, async (_event, connectionId: number, remotePath: string) => {
		await tempManager.ensureDir(connectionId, remotePath);
	});

	ipcMain.handle(IPC.FILE_TEMP_DELETE, async (_event, connectionId: number, remotePath: string) => {
		await tempManager.deletePath(connectionId, remotePath);
	});

	ipcMain.handle(IPC.FILE_TEMP_EXISTS, async (_event, connectionId: number, remotePath: string) => {
		return tempManager.exists(connectionId, remotePath);
	});

	ipcMain.handle(IPC.FILE_WATCH_START, (_event, watcherId: string, dirPath: string) => {
		const normalized = normalizePath(dirPath);
		fileWatcher.start(watcherId, normalized);
	});

	ipcMain.handle(IPC.FILE_WATCH_STOP, (_event, watcherId: string) => {
		fileWatcher.stop(watcherId);
	});
}

export async function openPath(filePath: string): Promise<void> {
	const result = await shell.openPath(filePath);
	if (result) {
		throw new Error(result);
	}
}
