import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConnectionStore } from "./connection-store";
import type { NewConnection } from "../shared/types";

const testConnection: NewConnection = {
	name: "Test Server",
	protocol: "sftp",
	host: "example.com",
	port: 22,
	username: "user",
	authType: "password",
	password: "pass123",
	privateKeyPath: "",
	accessKey: "",
	secretKey: "",
	region: "us-east-1",
	bucket: "",
	endpoint: "",
	useHttps: true,
	groupName: "",
};

describe("ConnectionStore", () => {
	let tmpDir: string;
	let store: ConnectionStore;

	beforeEach(() => {
		vi.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
		tmpDir = mkdtempSync(join(tmpdir(), "openscp-test-"));
		store = new ConnectionStore(tmpDir);
	});

	afterEach(() => {
		vi.useRealTimers();
		rmSync(tmpDir, { recursive: true, force: true });
	});

	describe("list", () => {
		it("returns empty array for new store", () => {
			expect(store.list()).toEqual([]);
		});

		it("returns all created connections", () => {
			store.create(testConnection);
			store.create({ ...testConnection, name: "Second" });
			expect(store.list()).toHaveLength(2);
		});
	});

	describe("get", () => {
		it("returns undefined for non-existent id", () => {
			expect(store.get(999)).toBeUndefined();
		});

		it("returns connection by id", () => {
			const created = store.create(testConnection);
			const found = store.get(created.id);
			expect(found).toBeDefined();
			if (found) {
				expect(found.name).toBe("Test Server");
			}
		});
	});

	describe("create", () => {
		it("creates connection with auto-increment id", () => {
			const c1 = store.create(testConnection);
			const c2 = store.create(testConnection);
			expect(c1.id).toBe(1);
			expect(c2.id).toBe(2);
		});

		it("sets createdAt and updatedAt", () => {
			const c = store.create(testConnection);
			expect(c.createdAt).toBeTruthy();
			expect(c.updatedAt).toBeTruthy();
			expect(c.createdAt).toBe(c.updatedAt);
		});

		it("copies all fields from NewConnection", () => {
			const c = store.create(testConnection);
			expect(c.name).toBe("Test Server");
			expect(c.protocol).toBe("sftp");
			expect(c.host).toBe("example.com");
			expect(c.port).toBe(22);
			expect(c.username).toBe("user");
			expect(c.authType).toBe("password");
			expect(c.password).toBe("pass123");
		});
	});

	describe("update", () => {
		it("returns undefined for non-existent id", () => {
			expect(store.update(999, { name: "X" })).toBeUndefined();
		});

		it("updates specified fields", () => {
			const created = store.create(testConnection);
			const updated = store.update(created.id, { name: "Updated Server" });
			expect(updated).toBeDefined();
			if (updated) {
				expect(updated.name).toBe("Updated Server");
				expect(updated.host).toBe("example.com");
			}
		});

		it("updates updatedAt timestamp", () => {
			const created = store.create(testConnection);
			vi.advanceTimersByTime(10);
			const updated = store.update(created.id, { port: 2222 });
			expect(updated).toBeDefined();
			if (updated) {
				expect(updated.updatedAt).not.toBe(created.updatedAt);
			}
		});

		it("preserves id", () => {
			const created = store.create(testConnection);
			const updated = store.update(created.id, { name: "X" });
			expect(updated).toBeDefined();
			if (updated) {
				expect(updated.id).toBe(created.id);
			}
		});
	});

	describe("delete", () => {
		it("returns false for non-existent id", () => {
			expect(store.delete(999)).toBe(false);
		});

		it("removes connection and returns true", () => {
			const created = store.create(testConnection);
			expect(store.delete(created.id)).toBe(true);
			expect(store.get(created.id)).toBeUndefined();
			expect(store.list()).toHaveLength(0);
		});
	});

	describe("persistence", () => {
		it("writes to connections.json file", () => {
			store.create(testConnection);
			store.flush();
			expect(existsSync(join(tmpDir, "connections.json"))).toBe(true);
		});

		it("loads persisted data on construction", () => {
			store.create(testConnection);
			store.flush();

			const store2 = new ConnectionStore(tmpDir);
			expect(store2.list()).toHaveLength(1);
			expect(store2.list()[0].name).toBe("Test Server");
		});

		it("preserves nextId across restarts", () => {
			store.create(testConnection);
			store.create(testConnection);
			store.flush();

			const store2 = new ConnectionStore(tmpDir);
			const c = store2.create(testConnection);
			expect(c.id).toBe(3);
		});
	});

	describe("import", () => {
		it("replaces all connections", () => {
			store.create(testConnection);
			store.import([], 1);
			store.flush();

			const store2 = new ConnectionStore(tmpDir);
			expect(store2.list()).toHaveLength(0);
		});

		it("sets nextId from argument", () => {
			store.import([], 42);
			store.flush();

			const store2 = new ConnectionStore(tmpDir);
			const c = store2.create(testConnection);
			expect(c.id).toBe(42);
		});
	});
});
