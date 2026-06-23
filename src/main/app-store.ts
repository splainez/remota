import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import {
	AppConfigSchema,
	FONT_SIZE_DEFAULT,
	MAX_PARALLEL_TRANSFERS_DEFAULT,
	MAX_SESSIONS_DEFAULT,
} from "@shared/app-config-schema";
import type { AppConfig, FileColumnId } from "@shared/app-config-schema";
import { DEFAULT_VISIBLE_COLUMNS } from "@shared/app-config-schema";
import type {
	FilePaneSizeUpdate,
	FileColumnsUpdate,
	Settings,
	SettingsUpdate,
	TransferPanelUpdate,
} from "@shared/app-config-schema";
import { LoggerFactory } from "@shared/lib/logger";
import type { Connection, NewConnection, ConnectionUpdate } from "@shared/types";

const log = LoggerFactory.init({ name: "app-store" });

export class ConfigValidationError extends Error {
	constructor(
		message: string,
		public readonly filePath: string,
		public readonly issues: string[],
	) {
		super(message);
		this.name = "ConfigValidationError";
	}
}

export class AppStore {
	private filePath: string;
	private data: AppConfig = {
		connections: [],
		recentConnectionIds: [],
		lastPaths: {},
		transferPanels: {},
		filePaneSizes: {},
		fileColumns: { visibleColumns: DEFAULT_VISIBLE_COLUMNS },
		settings: {
			theme: "system",
			locale: "en",
			maxParallelTransfers: MAX_PARALLEL_TRANSFERS_DEFAULT,
			maxSessions: MAX_SESSIONS_DEFAULT,
			remoteDoubleClickAction: "open",
			fontSize: FONT_SIZE_DEFAULT,
		},
	};
	private nextId = 1;
	private saveTimer: ReturnType<typeof setTimeout> | null = null;
	private loadError: ConfigValidationError | null = null;

	constructor(userDataPath: string) {
		mkdirSync(userDataPath, { recursive: true });
		this.filePath = join(userDataPath, "app-config.json");
		this.load();
	}

	private load() {
		this.loadError = null;

		if (!existsSync(this.filePath)) {
			this.data = {
				connections: [],
				recentConnectionIds: [],
				lastPaths: {},
				transferPanels: {},
				filePaneSizes: {},
				fileColumns: { visibleColumns: DEFAULT_VISIBLE_COLUMNS },
				settings: {
					theme: "system",
					locale: "en",
					maxParallelTransfers: MAX_PARALLEL_TRANSFERS_DEFAULT,
					maxSessions: MAX_SESSIONS_DEFAULT,
					remoteDoubleClickAction: "open",
					fontSize: FONT_SIZE_DEFAULT,
				},
			};
			this.save();
			return;
		}

		try {
			const raw = readFileSync(this.filePath, "utf-8");
			const parsed: unknown = JSON.parse(raw);
			const migrated = AppStore.migrate(parsed);
			const result = AppConfigSchema.safeParse(migrated);

			if (!result.success) {
				const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
				this.loadError = new ConfigValidationError("Invalid configuration file", this.filePath, issues);
				this.data = {
					connections: [],
					recentConnectionIds: [],
					lastPaths: {},
					transferPanels: {},
					filePaneSizes: {},
					fileColumns: { visibleColumns: DEFAULT_VISIBLE_COLUMNS },
					settings: {
						theme: "system",
						locale: "en",
						maxParallelTransfers: MAX_PARALLEL_TRANSFERS_DEFAULT,
						maxSessions: MAX_SESSIONS_DEFAULT,
						remoteDoubleClickAction: "open",
						fontSize: FONT_SIZE_DEFAULT,
					},
				};
				return;
			}

			this.data = result.data;
			this.computeNextId();
		} catch (err) {
			this.loadError = new ConfigValidationError("Failed to read configuration file", this.filePath, [
				(err as Error).message,
			]);
			this.data = {
				connections: [],
				recentConnectionIds: [],
				lastPaths: {},
				transferPanels: {},
				filePaneSizes: {},
				fileColumns: { visibleColumns: DEFAULT_VISIBLE_COLUMNS },
				settings: {
					theme: "system",
					locale: "en",
					maxParallelTransfers: MAX_PARALLEL_TRANSFERS_DEFAULT,
					maxSessions: MAX_SESSIONS_DEFAULT,
					remoteDoubleClickAction: "open",
					fontSize: FONT_SIZE_DEFAULT,
				},
			};
		}
	}

	private static migrate(raw: unknown): unknown {
		if (!raw || typeof raw !== "object") return raw;
		const obj = raw as Record<string, unknown>;
		if (!Array.isArray(obj.connections)) return raw;

		const defaultKeyPath = join(homedir(), ".ssh", "id_rsa");
		const connections = obj.connections.map((conn: Record<string, unknown>) => {
			if (conn.authType === "agent") {
				// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string should fall back to default
				return { ...conn, authType: "key", privateKeyPath: conn.privateKeyPath || defaultKeyPath };
			}
			return conn;
		});

		const hasAgent = obj.connections.some((conn: Record<string, unknown>) => conn.authType === "agent");
		if (!hasAgent) return raw;
		log.info("Migrated agent-auth connections to key-auth");
		return { ...obj, connections };
	}

	private computeNextId() {
		if (this.data.connections.length === 0) {
			this.nextId = 1;
			return;
		}
		this.nextId = Math.max(...this.data.connections.map((c) => c.id)) + 1;
	}

	private save() {
		if (this.saveTimer) return;
		this.saveTimer = setTimeout(() => {
			this.saveTimer = null;
			try {
				writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
			} catch (err) {
				log.error("Failed to save app-config.json", { err });
			}
		}, 500);
	}

	getLoadError(): ConfigValidationError | null {
		return this.loadError;
	}

	getFilePath(): string {
		return this.filePath;
	}

	/** Re-read the config file from disk. Clears any cached error. */
	reload() {
		this.load();
	}

	// ── Connections ──────────────────────────────────────

	list(): Connection[] {
		return this.data.connections;
	}

	get(id: number): Connection | undefined {
		return this.data.connections.find((c) => c.id === id);
	}

	create(data: NewConnection): Connection {
		const now = new Date().toISOString();
		const connection: Connection = {
			id: this.nextId++,
			...data,
			createdAt: now,
			updatedAt: now,
		};
		this.data.connections.push(connection);
		this.save();
		return connection;
	}

	update(id: number, data: Omit<ConnectionUpdate, "id">): Connection | undefined {
		const idx = this.data.connections.findIndex((c) => c.id === id);
		if (idx === -1) return undefined;
		const now = new Date().toISOString();
		this.data.connections[idx] = {
			...this.data.connections[idx],
			...data,
			id,
			updatedAt: now,
		};
		this.save();
		return this.data.connections[idx];
	}

	delete(id: number): boolean {
		const idx = this.data.connections.findIndex((c) => c.id === id);
		if (idx === -1) return false;
		this.data.connections.splice(idx, 1);
		this.data.recentConnectionIds = this.data.recentConnectionIds.filter((rid) => rid !== id);
		this.save();
		return true;
	}

	// ── Recent Connections ──────────────────────────────

	private static readonly MAX_RECENT = 5;

	getRecentConnections(): number[] {
		return this.data.recentConnectionIds;
	}

	markRecent(id: number) {
		this.data.recentConnectionIds = this.data.recentConnectionIds.filter((rid) => rid !== id);
		this.data.recentConnectionIds.unshift(id);
		if (this.data.recentConnectionIds.length > AppStore.MAX_RECENT) {
			this.data.recentConnectionIds = this.data.recentConnectionIds.slice(0, AppStore.MAX_RECENT);
		}
		this.save();
	}

	// ── Last Paths ───────────────────────────────────────

	getLocalPath(connectionId: number): string | undefined {
		const key = String(connectionId);
		if (!(key in this.data.lastPaths)) return undefined;
		return this.data.lastPaths[key].local;
	}

	getRemotePath(connectionId: number): string | undefined {
		const key = String(connectionId);
		if (!(key in this.data.lastPaths)) return undefined;
		return this.data.lastPaths[key].remote;
	}

	setLocalPath(connectionId: number, path: string) {
		const key = String(connectionId);
		if (!(key in this.data.lastPaths)) {
			this.data.lastPaths[key] = { local: path };
		} else {
			this.data.lastPaths[key].local = path;
		}
		this.save();
	}

	setRemotePath(connectionId: number, path: string) {
		const key = String(connectionId);
		if (!(key in this.data.lastPaths)) {
			this.data.lastPaths[key] = { remote: path };
		} else {
			this.data.lastPaths[key].remote = path;
		}
		this.save();
	}

	// ── Transfer Panels ─────────────────────────────────

	getTransferPanel(connectionId: number): { visible: boolean } | undefined {
		const key = String(connectionId);
		return this.data.transferPanels[key];
	}

	getAllTransferPanels(): Record<number, { visible: boolean }> {
		const result: Record<number, { visible: boolean }> = {};
		for (const [key, value] of Object.entries(this.data.transferPanels)) {
			const id = Number(key);
			if (Number.isFinite(id)) {
				result[id] = value;
			}
		}
		return result;
	}

	setTransferPanel(connectionId: number, update: TransferPanelUpdate) {
		const key = String(connectionId);
		const current = this.data.transferPanels[key] ?? { visible: false };
		this.data.transferPanels[key] = { ...current, ...update };
		this.save();
	}

	// ── File Pane Sizes ────────────────────────────────

	getFilePaneSize(connectionId: number): { localSize: number } | undefined {
		const key = String(connectionId);
		return this.data.filePaneSizes[key];
	}

	getAllFilePaneSizes(): Record<number, { localSize: number }> {
		const result: Record<number, { localSize: number }> = {};
		for (const [key, value] of Object.entries(this.data.filePaneSizes)) {
			const id = Number(key);
			if (Number.isFinite(id)) {
				result[id] = value;
			}
		}
		return result;
	}

	setFilePaneSize(connectionId: number, update: FilePaneSizeUpdate) {
		const key = String(connectionId);
		const current = this.data.filePaneSizes[key] ?? { localSize: 50 };
		this.data.filePaneSizes[key] = { ...current, ...update };
		this.save();
	}

	// ── File Columns ────────────────────────────────

	getFileColumns(): { visibleColumns: FileColumnId[] } {
		return this.data.fileColumns;
	}

	setFileColumns(update: FileColumnsUpdate) {
		const current = this.data.fileColumns;
		this.data.fileColumns = { ...current, ...update };
		this.save();
	}

	// ── Settings ───────────────────────────────────────

	getSettings(): Settings {
		return this.data.settings;
	}

	setSettings(update: SettingsUpdate): Settings {
		this.data.settings = { ...this.data.settings, ...update };
		this.save();
		return this.data.settings;
	}

	// ── Exe Path ───────────────────────────────────────

	getExePath(): string | undefined {
		return this.data.exePath;
	}

	setExePath(exePath: string) {
		this.data.exePath = exePath;
		this.save();
	}

	// ── Persistence ──────────────────────────────────────

	/** Force immediate write. */
	flush() {
		try {
			writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
		} catch (err) {
			log.error("Failed to flush app-config.json", { err });
		}
	}
}
