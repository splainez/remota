import { execFileSync } from "node:child_process";
import { readdirSync, renameSync, statSync, existsSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, sep } from "node:path";

import type { AppStore } from "@main/app-store";
import type { FileWatcherManager } from "@main/file-watcher/file-watcher-manager";
import { tempManager } from "@main/temp/temp-manager";
import { IPC } from "@shared/ipc-channels";
import { LoggerFactory } from "@shared/lib/logger";
import type { FileEntry } from "@shared/types";
import { deleteParamsSchema, renameParamsSchema, createParamsSchema } from "@shared/validation";
import { app, ipcMain, shell } from "electron";

const logger = LoggerFactory.init({ name: "main.ipc.filesystem" });

const isLinux = process.platform === "linux";
const isUnix = process.platform !== "win32";

const uidCache = new Map<number, string>();
const gidCache = new Map<number, string>();

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
			const entry: FileEntry = {
				name,
				fullPath,
				isDirectory: stats.isDirectory(),
				size: stats.isFile() ? stats.size : 0,
				modified: stats.mtime.toISOString(),
			};

			if (isUnix) {
				entry.mode = stats.mode;
				entry.uid = stats.uid;
				entry.gid = stats.gid;
			}

			entries.push(entry);
		} catch {
			entries.push({ name, fullPath, isDirectory: false, size: 0, modified: "" });
		}
	}

	return entries;
}

export function resolveLocalUserNames(entries: FileEntry[]): void {
	if (!isLinux) return;

	const uncachedUids = new Set<number>();
	const uncachedGids = new Set<number>();

	for (const entry of entries) {
		if (entry.uid != null && !uidCache.has(entry.uid)) {
			uncachedUids.add(entry.uid);
		}
		if (entry.gid != null && !gidCache.has(entry.gid)) {
			uncachedGids.add(entry.gid);
		}
	}

	if (uncachedUids.size === 0 && uncachedGids.size === 0) {
		for (const entry of entries) {
			if (entry.uid != null) {
				entry.ownerName = uidCache.get(entry.uid);
			}
			if (entry.gid != null) {
				entry.groupName = gidCache.get(entry.gid);
			}
		}
		return;
	}

	try {
		if (uncachedUids.size > 0) {
			const uids = [...uncachedUids];
			const output = execFileSync("getent", ["passwd", ...uids.map(String)], {
				timeout: 2000,
				encoding: "utf-8",
				stdio: ["pipe", "pipe", "pipe"],
			}).trim();

			for (const line of output.split("\n")) {
				const parts = line.split(":");
				if (parts.length >= 3 && parts[0] && parts[2]) {
					const uid = Number(parts[2]);
					const name = parts[0];
					if (Number.isFinite(uid)) {
						uidCache.set(uid, name);
					}
				}
			}
		}

		if (uncachedGids.size > 0) {
			const gids = [...uncachedGids];
			const output = execFileSync("getent", ["group", ...gids.map(String)], {
				timeout: 2000,
				encoding: "utf-8",
				stdio: ["pipe", "pipe", "pipe"],
			}).trim();

			for (const line of output.split("\n")) {
				const parts = line.split(":");
				if (parts.length >= 3 && parts[0] && parts[2]) {
					const gid = Number(parts[2]);
					const name = parts[0];
					if (Number.isFinite(gid)) {
						gidCache.set(gid, name);
					}
				}
			}
		}
	} catch {
		// getent failed — fall through and leave numeric IDs
	}

	for (const entry of entries) {
		if (entry.uid != null) {
			entry.ownerName = uidCache.get(entry.uid);
		}
		if (entry.gid != null) {
			entry.groupName = gidCache.get(entry.gid);
		}
	}
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
		const entries = listDirectory(normalized);
		resolveLocalUserNames(entries);
		return entries;
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
		const parsed = deleteParamsSchema.safeParse({ filePath });
		if (!parsed.success) {
			throw new Error(`Invalid delete params: ${parsed.error.message}`);
		}
		try {
			rmSync(parsed.data.filePath, { recursive: true, force: true });
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			logger.error("delete failed", { path: parsed.data.filePath, error: message });
			throw new Error(`Delete failed: ${message}`, { cause: err });
		}
	});

	ipcMain.handle(IPC.FILE_MKDIR, (_event, parentPath: string, name: string) => {
		const parsed = createParamsSchema.safeParse({ parentPath, name });
		if (!parsed.success) {
			throw new Error(`Invalid mkdir params: ${parsed.error.message}`);
		}
		const fullPath = join(parsed.data.parentPath, parsed.data.name);
		try {
			mkdirSync(fullPath, { recursive: true });
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			logger.error("mkdir failed", { path: fullPath, error: message });
			throw new Error(`Mkdir failed: ${message}`, { cause: err });
		}
	});

	ipcMain.handle(IPC.FILE_CREATE_FILE, (_event, parentPath: string, name: string) => {
		const parsed = createParamsSchema.safeParse({ parentPath, name });
		if (!parsed.success) {
			throw new Error(`Invalid createFile params: ${parsed.error.message}`);
		}
		const fullPath = join(parsed.data.parentPath, parsed.data.name);
		try {
			writeFileSync(fullPath, "");
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			logger.error("createFile failed", { path: fullPath, error: message });
			throw new Error(`CreateFile failed: ${message}`, { cause: err });
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
