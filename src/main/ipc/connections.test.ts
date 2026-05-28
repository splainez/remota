import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { IPC } from "../../shared/ipc-channels";
import { ConnectionStore } from "../connection-store";
import type { NewConnection } from "../../shared/types";

vi.mock("electron", () => ({
	ipcMain: { handle: vi.fn() },
}));

import { registerConnectionHandlers } from "./connections";
import { ipcMain } from "electron";

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

function callHandler(channel: string, ...args: unknown[]): unknown {
	const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls as [string, (...a: unknown[]) => unknown][];
	const entry = calls.find((c) => c[0] === channel);
	if (!entry?.[1]) {
		throw new Error(`Handler not found for channel: ${channel}`);
	}
	return entry[1]({}, ...args);
}

describe("connection IPC handlers", () => {
	let tmpDir: string;
	let store: ConnectionStore;

	beforeEach(() => {
		vi.clearAllMocks();
		tmpDir = mkdtempSync(join(tmpdir(), "openscp-ipc-"));
		store = new ConnectionStore(tmpDir);
		registerConnectionHandlers(store);
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("registers all connection handlers", () => {
		const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls as [string, unknown][];
		const channels = calls.map((c) => c[0]);
		expect(channels).toContain(IPC.CONNECTION_LIST);
		expect(channels).toContain(IPC.CONNECTION_GET);
		expect(channels).toContain(IPC.CONNECTION_CREATE);
		expect(channels).toContain(IPC.CONNECTION_UPDATE);
		expect(channels).toContain(IPC.CONNECTION_DELETE);
		expect(calls.length).toBe(5);
	});

	describe("CONNECTION_LIST", () => {
		it("returns empty array when no connections", async () => {
			const result = await callHandler(IPC.CONNECTION_LIST);
			expect(result).toEqual([]);
		});

		it("returns all connections", async () => {
			store.create(testConnection);
			store.create({ ...testConnection, name: "Second" });
			const result = (await callHandler(IPC.CONNECTION_LIST)) as { name: string }[];
			expect(result).toHaveLength(2);
		});
	});

	describe("CONNECTION_GET", () => {
		it("returns null for non-existent", async () => {
			const result = await callHandler(IPC.CONNECTION_GET, 999);
			expect(result).toBeNull();
		});

		it("returns connection by id", async () => {
			const created = store.create(testConnection);
			const result = (await callHandler(IPC.CONNECTION_GET, created.id)) as { name: string };
			expect(result.name).toBe("Test Server");
		});
	});

	describe("CONNECTION_CREATE", () => {
		it("creates and returns connection", async () => {
			const result = (await callHandler(IPC.CONNECTION_CREATE, testConnection)) as { id: number };
			expect(result.id).toBeDefined();
			expect(store.list()).toHaveLength(1);
		});

		it("throws on invalid data", () => {
			expect(() => callHandler(IPC.CONNECTION_CREATE, { name: "" })).toThrow("Invalid connection data");
		});
	});

	describe("CONNECTION_UPDATE", () => {
		it("updates and returns connection", async () => {
			const created = store.create(testConnection);
			const result = (await callHandler(IPC.CONNECTION_UPDATE, {
				id: created.id,
				name: "Updated",
			})) as { name: string };
			expect(result.name).toBe("Updated");
		});

		it("returns null for non-existent id", async () => {
			const result = await callHandler(IPC.CONNECTION_UPDATE, { id: 999, name: "X" });
			expect(result).toBeNull();
		});
	});

	describe("CONNECTION_DELETE", () => {
		it("deletes and returns true", async () => {
			const created = store.create(testConnection);
			const result = await callHandler(IPC.CONNECTION_DELETE, created.id);
			expect(result).toBe(true);
			expect(store.list()).toHaveLength(0);
		});

		it("returns false for non-existent id", async () => {
			const result = await callHandler(IPC.CONNECTION_DELETE, 999);
			expect(result).toBe(false);
		});
	});
});
