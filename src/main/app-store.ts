import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { LoggerFactory } from "../shared/lib/logger";
import { AppConfigSchema } from "../shared/app-config-schema";
import type { AppConfig } from "../shared/app-config-schema";
import type { Connection, NewConnection, ConnectionUpdate } from "../shared/types";

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
	private data: AppConfig = { connections: [], lastPaths: {}, settings: {} };
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
			this.data = { connections: [], lastPaths: {}, settings: {} };
			this.save();
			return;
		}

		try {
			const raw = readFileSync(this.filePath, "utf-8");
			const parsed: unknown = JSON.parse(raw);
			const result = AppConfigSchema.safeParse(parsed);

			if (!result.success) {
				const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
				this.loadError = new ConfigValidationError("Invalid configuration file", this.filePath, issues);
				this.data = { connections: [], lastPaths: {}, settings: {} };
				return;
			}

			this.data = result.data;
			this.computeNextId();
		} catch (err) {
			this.loadError = new ConfigValidationError("Failed to read configuration file", this.filePath, [
				(err as Error).message,
			]);
			this.data = { connections: [], lastPaths: {}, settings: {} };
		}
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
				log.error({ err }, "Failed to save app-config.json");
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
		this.save();
		return true;
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

	// ── Persistence ──────────────────────────────────────

	/** Force immediate write. */
	flush() {
		try {
			writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
		} catch (err) {
			log.error({ err }, "Failed to flush app-config.json");
		}
	}
}
