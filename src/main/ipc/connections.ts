import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { AppStore } from "@main/app-store";
import { IPC } from "@shared/ipc-channels";
import type { NewConnection, ConnectionUpdate } from "@shared/types";
import { connectionFormSchema, connectionBaseSchema } from "@shared/validation";
import { dialog, ipcMain } from "electron";

import { connectionsToSshConfig } from "./ssh-config-export";
import { parseSshConfigToConnections } from "./ssh-config-import";

function getDefaultExportPath(): string {
	const now = new Date();
	const parts = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(
		now,
	);
	const year = parts.find((p) => p.type === "year")?.value ?? "";
	const month = parts.find((p) => p.type === "month")?.value ?? "";
	const day = parts.find((p) => p.type === "day")?.value ?? "";
	return join(homedir(), ".ssh", `config_${year}${month}${day}`);
}

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

	ipcMain.handle(IPC.CONNECTION_GET_RECENT, () => {
		return store.getRecentConnections();
	});

	ipcMain.handle(IPC.CONNECTION_MARK_RECENT, (_event, id: number) => {
		store.markRecent(id);
	});

	ipcMain.handle(IPC.CONNECTION_IMPORT_SSH_CONFIG, async () => {
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
				if (err instanceof Error) {
					errors.push(`Failed to import ${conn.name}: ${err.message}`);
				} else {
					errors.push(`Failed to import ${conn.name}: ${String(err)}`);
				}
			}
		}

		return { imported, errors };
	});

	ipcMain.handle(IPC.CONNECTION_EXPORT_SSH_CONFIG, async () => {
		const connections = store.list();
		const configText = connectionsToSshConfig(connections);

		if (!configText) {
			return { exported: 0, errors: [] };
		}

		const saveResult = await dialog.showSaveDialog({
			title: "Export SSH Config",
			defaultPath: getDefaultExportPath(),
			filters: [
				{ name: "SSH Config", extensions: ["config"] },
				{ name: "All Files", extensions: ["*"] },
			],
		});
		if (saveResult.canceled || !saveResult.filePath) {
			return { exported: 0, errors: [] };
		}

		try {
			writeFileSync(saveResult.filePath, configText, "utf-8");
		} catch (err) {
			return { exported: 0, errors: [`Could not write file: ${(err as Error).message}`] };
		}

		const sshCount = connections.filter((c) => c.protocol === "sftp" || c.protocol === "scp").length;
		return { exported: sshCount, errors: [] };
	});
}
