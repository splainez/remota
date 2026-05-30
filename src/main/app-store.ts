import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
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

export async function migrateLegacyFiles(userDataPath: string): Promise<void> {
	const newConfigPath = join(userDataPath, "app-config.json");
	if (existsSync(newConfigPath)) return;

	const connectionsPath = join(userDataPath, "connections.json");
	const lastPathsPath = join(userDataPath, "last-paths.json");
	const dbPath = join(userDataPath, "openscp.db");

	const hasConnections = existsSync(connectionsPath);
	const hasLastPaths = existsSync(lastPathsPath);
	const hasDb = !hasConnections && existsSync(dbPath);

	if (!hasConnections && !hasLastPaths && !hasDb) return;

	let connections: Connection[] = [];
	const lastPaths: AppConfig["lastPaths"] = {};

	if (hasConnections) {
		try {
			const raw = readFileSync(connectionsPath, "utf-8");
			const parsed: Record<string, unknown> = JSON.parse(raw);
			if (Array.isArray(parsed.connections)) {
				connections = parsed.connections as Connection[];
			}
		} catch {
			log.warn("Failed to read legacy connections.json during migration");
		}
	}

	if (hasDb) {
		try {
			const connectionsFromDb = await migrateFromSqlite(dbPath);
			connections = connectionsFromDb;
		} catch {
			log.warn("Failed to migrate from SQLite database");
		}
	}

	if (hasLastPaths) {
		try {
			const raw = readFileSync(lastPathsPath, "utf-8");
			const parsed = JSON.parse(raw) as AppConfig["lastPaths"];
			if (typeof parsed === "object" && parsed !== null) {
				Object.assign(lastPaths, parsed);
			}
		} catch {
			log.warn("Failed to read legacy last-paths.json during migration");
		}
	}

	const config: AppConfig = {
		connections,
		lastPaths,
		settings: {},
	};

	try {
		writeFileSync(newConfigPath, JSON.stringify(config, null, 2), "utf-8");
		log.info("Migrated legacy files to app-config.json");

		if (hasConnections) {
			renameSync(connectionsPath, `${connectionsPath}.bak`);
		}
		if (hasDb) {
			renameSync(dbPath, `${dbPath}.bak`);
		}
		if (hasLastPaths) {
			renameSync(lastPathsPath, `${lastPathsPath}.bak`);
		}
	} catch (err) {
		log.error({ err }, "Failed to write app-config.json during migration");
	}
}

async function migrateFromSqlite(dbPath: string): Promise<Connection[]> {
	const initSqlJs = (await import("sql.js")).default;
	const SQL = await initSqlJs();

	const buffer = readFileSync(dbPath);
	const sqlDb = new SQL.Database(buffer);

	const results = sqlDb.exec("SELECT * FROM connections");

	if (results.length === 0 || results[0].values.length === 0) {
		sqlDb.close();
		return [];
	}

	const columnNames = results[0].columns;
	const rows = results[0].values.map((row) => {
		const obj: Record<string, unknown> = {};
		columnNames.forEach((col, i) => {
			obj[col] = row[i];
		});
		return obj as Record<string, unknown>;
	});

	const connections: Connection[] = rows.map((row) => {
		const authTypeRaw = String(row.auth_type ?? "password");
		const authType: Connection["authType"] =
			authTypeRaw === "key" || authTypeRaw === "agent" ? authTypeRaw : "password";

		return {
			id: Number(row.id),
			name: String(row.name ?? ""),
			protocol: String(row.protocol ?? "sftp") as Connection["protocol"],
			host: String(row.host ?? ""),
			port: Number(row.port),
			username: String(row.username ?? ""),
			authType,
			password: String(row.password ?? ""),
			privateKeyPath: String(row.private_key_path ?? ""),
			accessKey: String(row.access_key ?? ""),
			secretKey: String(row.secret_key ?? ""),
			region: String(row.region ?? ""),
			bucket: String(row.bucket ?? ""),
			endpoint: String(row.endpoint ?? ""),
			useHttps: Number(row.use_https) === 1,
			groupName: String(row.group_name ?? ""),
			createdAt: String(row.created_at ?? new Date().toISOString()),
			updatedAt: String(row.updated_at ?? new Date().toISOString()),
		};
	});

	sqlDb.close();
	return connections;
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

	/** Bulk-import connections (for migration). No auto-save — caller calls flush(). */
	importConnections(connections: Connection[], nextId?: number) {
		this.data.connections = connections;
		if (nextId !== undefined) {
			this.nextId = nextId;
		} else {
			this.computeNextId();
		}
	}

	// ── Last Paths ───────────────────────────────────────

	getLocalPath(connectionId: number): string | undefined {
		return this.data.lastPaths[String(connectionId)]?.local;
	}

	getRemotePath(connectionId: number): string | undefined {
		return this.data.lastPaths[String(connectionId)]?.remote;
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

	/** Force immediate write. Use after importConnections() to persist. */
	flush() {
		try {
			writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
		} catch (err) {
			log.error({ err }, "Failed to flush app-config.json");
		}
	}
}
