import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { LoggerFactory } from "../shared/lib/logger";
import type { Connection, NewConnection, ConnectionUpdate } from "../shared/types";

const log = LoggerFactory.init({ name: "connection-store" });

interface StoreData {
	nextId: number;
	connections: Connection[];
}

export class ConnectionStore {
	private filePath: string;
	private data: StoreData = { nextId: 1, connections: [] };
	private saveTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(userDataPath: string) {
		mkdirSync(userDataPath, { recursive: true });
		this.filePath = join(userDataPath, "connections.json");
		this.load();
	}

	load() {
		try {
			if (existsSync(this.filePath)) {
				const raw = readFileSync(this.filePath, "utf-8");
				const parsed = JSON.parse(raw) as StoreData;
				if (typeof parsed.nextId === "number" && Array.isArray(parsed.connections)) {
					this.data = parsed;
				}
			}
		} catch (err) {
			log.error({ err }, "Failed to load connections.json, starting fresh");
			this.data = { nextId: 1, connections: [] };
		}
	}

	private save() {
		if (this.saveTimer) return;
		this.saveTimer = setTimeout(() => {
			this.saveTimer = null;
			try {
				writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
			} catch (err) {
				log.error({ err }, "Failed to save connections.json");
			}
		}, 500);
	}

	list(): Connection[] {
		return this.data.connections;
	}

	get(id: number): Connection | undefined {
		return this.data.connections.find((c) => c.id === id);
	}

	create(data: NewConnection): Connection {
		const now = new Date().toISOString();
		const connection: Connection = {
			id: this.data.nextId++,
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
	import(connections: Connection[], nextId?: number) {
		this.data.connections = connections;
		if (nextId !== undefined) {
			this.data.nextId = nextId;
		}
	}

	/** Force immediate write. Use after import() to persist. */
	flush() {
		try {
			writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
		} catch (err) {
			log.error({ err }, "Failed to flush connections.json");
		}
	}

	getFilePath(): string {
		return this.filePath;
	}
}
