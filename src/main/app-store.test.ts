import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppStore } from "./app-store";
import type { NewConnection } from "../shared/types";

function makeNewConnection(overrides: Partial<NewConnection> = {}): NewConnection {
	return {
		name: "Test Server",
		protocol: "sftp",
		host: "example.com",
		port: 22,
		username: "user",
		authType: "password",
		password: "pass",
		privateKeyPath: "",
		accessKey: "",
		secretKey: "",
		region: "us-east-1",
		bucket: "",
		endpoint: "",
		useHttps: true,
		groupName: "",
		...overrides,
	};
}

describe("AppStore", () => {
	let tmpDir: string;
	let store: AppStore;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "openscp-store-"));
		store = new AppStore(tmpDir);
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	describe("initialization", () => {
		it("creates empty store when no file exists", () => {
			expect(store.list()).toEqual([]);
			expect(store.getLoadError()).toBeNull();
		});

		it("loads connections from existing file", () => {
			store.create(makeNewConnection());
			store.flush();

			const store2 = new AppStore(tmpDir);
			expect(store2.list()).toHaveLength(1);
			expect(store2.list()[0].name).toBe("Test Server");
		});

		it("sets loadError for invalid JSON", () => {
			writeFileSync(join(tmpDir, "app-config.json"), "{invalid}", "utf-8");
			const store2 = new AppStore(tmpDir);
			expect(store2.getLoadError()).not.toBeNull();
			expect(store2.getLoadError()?.issues.length).toBeGreaterThan(0);
		});

		it("sets loadError for schema-invalid config", () => {
			writeFileSync(join(tmpDir, "app-config.json"), JSON.stringify({ connections: "not-an-array" }), "utf-8");
			const store2 = new AppStore(tmpDir);
			expect(store2.getLoadError()).not.toBeNull();
		});
	});

	describe("reload", () => {
		it("clears loadError after fixing the config file", () => {
			writeFileSync(join(tmpDir, "app-config.json"), JSON.stringify({ connections: "bad-value" }), "utf-8");
			const store2 = new AppStore(tmpDir);
			expect(store2.getLoadError()).not.toBeNull();

			writeFileSync(join(tmpDir, "app-config.json"), JSON.stringify({ connections: [] }), "utf-8");
			store2.reload();
			expect(store2.getLoadError()).toBeNull();
		});
	});

	describe("CRUD operations", () => {
		it("creates a connection with auto-incremented id", () => {
			const c1 = store.create(makeNewConnection());
			const c2 = store.create(makeNewConnection());
			expect(c1.id).toBe(1);
			expect(c2.id).toBe(2);
		});

		it("lists all connections", () => {
			store.create(makeNewConnection());
			store.create(makeNewConnection());
			expect(store.list()).toHaveLength(2);
		});

		it("gets a connection by id", () => {
			const created = store.create(makeNewConnection());
			const found = store.get(created.id);
			expect(found).toBeDefined();
			expect(found?.name).toBe("Test Server");
		});

		it("returns undefined for non-existent id", () => {
			expect(store.get(999)).toBeUndefined();
		});

		it("updates a connection", () => {
			const created = store.create(makeNewConnection());
			const updated = store.update(created.id, { name: "Updated" });
			expect(updated?.name).toBe("Updated");
		});

		it("returns undefined when updating non-existent id", () => {
			expect(store.update(999, { name: "X" })).toBeUndefined();
		});

		it("deletes a connection", () => {
			const created = store.create(makeNewConnection());
			expect(store.delete(created.id)).toBe(true);
			expect(store.list()).toHaveLength(0);
		});

		it("returns false when deleting non-existent id", () => {
			expect(store.delete(999)).toBe(false);
		});
	});

	describe("last paths", () => {
		it("sets and gets local path", () => {
			store.setLocalPath(1, "/home/user");
			expect(store.getLocalPath(1)).toBe("/home/user");
		});

		it("sets and gets remote path", () => {
			store.setRemotePath(1, "/remote");
			expect(store.getRemotePath(1)).toBe("/remote");
		});

		it("returns undefined for non-existent path", () => {
			expect(store.getLocalPath(999)).toBeUndefined();
		});
	});

	describe("flush", () => {
		it("persists data to disk", () => {
			store.create(makeNewConnection());
			store.flush();
			const raw = readFileSync(join(tmpDir, "app-config.json"), "utf-8");
			const parsed = JSON.parse(raw);
			expect(parsed.connections).toHaveLength(1);
		});
	});
});

describe("AppStore with pre-existing data", () => {
	let tmpDir: string;
	let store: AppStore;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "openscp-store-"));
		store = new AppStore(tmpDir);
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("computes nextId from existing connections", () => {
		store.create(makeNewConnection()); // id=1
		store.create(makeNewConnection()); // id=2
		store.flush();

		const store2 = new AppStore(tmpDir);
		const c = store2.create(makeNewConnection());
		expect(c.id).toBe(3);
	});

	it("handles multiple connections with gaps in ids", () => {
		const c1 = store.create(makeNewConnection());
		store.delete(c1.id);
		const c2 = store.create(makeNewConnection());
		expect(c2.id).toBe(2);
	});

	it("isolates stores with different directories", () => {
		const tmpDir2 = mkdtempSync(join(tmpdir(), "openscp-store-"));
		const store2 = new AppStore(tmpDir2);

		store.create(makeNewConnection());
		expect(store2.list()).toHaveLength(0);

		rmSync(tmpDir2, { recursive: true, force: true });
	});

	it("getFilePath returns correct path", () => {
		expect(store.getFilePath()).toBe(join(tmpDir, "app-config.json"));
	});

	it("getLoadError returns null for fresh file", () => {
		expect(store.getLoadError()).toBeNull();
	});
});
