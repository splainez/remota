import { app, ipcMain } from "electron";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, sep } from "node:path";
import { homedir } from "node:os";
import { IPC } from "../../shared/ipc-channels";
import type { FileEntry } from "../../shared/types";
import type { LastPathStore } from "../last-path-store";

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

export function registerFilesystemHandlers(lastPathStore: LastPathStore) {
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
			return lastPathStore.getLocalPath(connectionId) ?? null;
		}
		return lastPathStore.getRemotePath(connectionId) ?? null;
	});

	ipcMain.handle(IPC.FILE_SET_LAST_PATH, (_event, connectionId: number, pane: "local" | "remote", path: string) => {
		if (pane === "local") {
			lastPathStore.setLocalPath(connectionId, path);
		} else {
			lastPathStore.setRemotePath(connectionId, path);
		}
	});
}
