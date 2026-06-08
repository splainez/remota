import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { AppStore } from "@main/app-store";
import { IPC } from "@shared/ipc-channels";
import type { NewConnection, ConnectionUpdate } from "@shared/types";
import { connectionFormSchema, connectionBaseSchema } from "@shared/validation";
import { dialog, ipcMain } from "electron";

import { parseSshConfigToConnections } from "./ssh-config-import";

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

	ipcMain.handle(IPC.CONNECTION_IMPORT_SSH_CONFIG, async (_event, filePath?: string) => {
		let resolvedPath = filePath;

		if (!resolvedPath) {
			const result = await dialog.showOpenDialog({
				title: "Import SSH Config",
				properties: ["openFile"],
				filters: [
					{ name: "SSH Config", extensions: ["config", ""] },
					{ name: "All Files", extensions: ["*"] },
				],
				defaultPath: join(homedir(), ".ssh", "config"),
			});
			if (result.canceled || result.filePaths.length === 0) {
				return { imported: 0, errors: [] };
			}
			resolvedPath = result.filePaths[0];
		}

		let content: string;
		try {
			content = readFileSync(resolvedPath, "utf-8");
		} catch {
			return { imported: 0, errors: [`Could not read file: ${resolvedPath}`] };
		}

		const parseResult = parseSshConfigToConnections(content);
		const errors = [...parseResult.errors];
		let imported = 0;

		for (const conn of parseResult.connections) {
			try {
				store.create(conn);
				imported++;
			} catch (err) {
				errors.push(`Failed to import "${conn.name}": ${(err as Error).message}`);
			}
		}

		return { imported, errors };
	});

	ipcMain.handle(IPC.CONNECTION_IMPORT_SSH_CONFIG_FILE, async () => {
		const result = await dialog.showOpenDialog({
			title: "Import SSH Config",
			properties: ["openFile"],
			filters: [
				{ name: "SSH Config", extensions: ["config", ""] },
				{ name: "All Files", extensions: ["*"] },
			],
			defaultPath: join(homedir(), ".ssh", "config"),
		});
		if (result.canceled || result.filePaths.length === 0) {
			return { imported: 0, errors: [] };
		}

		const filePath = result.filePaths[0];
		let content: string;
		try {
			content = readFileSync(filePath, "utf-8");
		} catch {
			return { imported: 0, errors: [`Could not read file: ${filePath}`] };
		}

		const parseResult = parseSshConfigToConnections(content);
		const errors = [...parseResult.errors];
		let imported = 0;

		for (const conn of parseResult.connections) {
			try {
				store.create(conn);
				imported++;
			} catch (err) {
				errors.push(`Failed to import "${conn.name}": ${(err as Error).message}`);
			}
		}

		return { imported, errors };
	});
}
