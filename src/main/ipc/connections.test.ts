import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { AppStore } from "@main/app-store";
import { IPC } from "@shared/ipc-channels";
import type { NewConnection } from "@shared/types";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("electron", () => ({
	ipcMain: { handle: vi.fn() },
}));

import { ipcMain } from "electron";

import { registerConnectionHandlers } from "./connections";

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

// eslint-disable-next-line @typescript-eslint/unbound-method -- ipcMain.handle is mocked via vi.fn()
const mockHandle = ipcMain.handle as unknown as ReturnType<typeof vi.fn>;

function getHandler(channel: string): (...args: unknown[]) => unknown {
	for (const call of mockHandle.mock.calls as [string, (...a: unknown[]) => unknown][]) {
		if (call[0] === channel) return call[1];
	}
	throw new Error(`Handler not found for channel: ${channel}`);
}

describe("connection IPC handlers", () => {
	let tmpDir: string;
	let store: AppStore;

	beforeEach(() => {
		vi.clearAllMocks();
		tmpDir = mkdtempSync(join(tmpdir(), "openscp-ipc-"));
		store = new AppStore(tmpDir);
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
		expect(channels).toContain(IPC.CONNECTION_GET_RECENT);
		expect(channels).toContain(IPC.CONNECTION_MARK_RECENT);
		expect(calls.length).toBe(7);
	});

	describe("CONNECTION_LIST", () => {
		it("returns empty array when no connections", async () => {
			const handler = getHandler(IPC.CONNECTION_LIST);
			const result = await handler();
			expect(result).toEqual([]);
		});

		it("returns all connections", async () => {
			store.create(testConnection);
			store.create({ ...testConnection, name: "Second" });
			const handler = getHandler(IPC.CONNECTION_LIST);
			const result = (await handler()) as { name: string }[];
			expect(result).toHaveLength(2);
		});
	});

	describe("CONNECTION_GET", () => {
		it("returns null for non-existent", async () => {
			const handler = getHandler(IPC.CONNECTION_GET);
			const result = await handler({}, 999);
			expect(result).toBeNull();
		});

		it("returns connection by id", async () => {
			const created = store.create(testConnection);
			const handler = getHandler(IPC.CONNECTION_GET);
			const result = (await handler({}, created.id)) as { name: string };
			expect(result.name).toBe("Test Server");
		});
	});

	describe("CONNECTION_CREATE", () => {
		it("creates and returns connection via store", () => {
			const result = store.create(testConnection);
			expect(result.id).toBeDefined();
			expect(store.list()).toHaveLength(1);
		});

		it("returns created connection object via IPC handler", async () => {
			const handler = getHandler(IPC.CONNECTION_CREATE);
			const result = (await handler({}, testConnection)) as { id: number };
			expect(result.id).toBeDefined();
		});

		it("throws on invalid data", () => {
			const handler = getHandler(IPC.CONNECTION_CREATE);
			expect(() => handler({}, { name: "" })).toThrow("Invalid connection data");
		});
	});

	describe("CONNECTION_UPDATE", () => {
		it("updates and returns connection", async () => {
			const created = store.create(testConnection);
			const handler = getHandler(IPC.CONNECTION_UPDATE);
			const result = (await handler(
				{},
				{
					id: created.id,
					name: "Updated",
				},
			)) as { name: string };
			expect(result.name).toBe("Updated");
		});

		it("returns null for non-existent id", async () => {
			const handler = getHandler(IPC.CONNECTION_UPDATE);
			const result = await handler({}, { id: 999, name: "X" });
			expect(result).toBeNull();
		});
	});

	describe("CONNECTION_DELETE", () => {
		it("deletes and returns true via store", () => {
			store.create(testConnection);
			const result = store.delete(1);
			expect(result).toBe(true);
			expect(store.list()).toHaveLength(0);
		});

		it("returns true for existing id via IPC handler", async () => {
			const created = store.create(testConnection);
			const handler = getHandler(IPC.CONNECTION_DELETE);
			const result = await handler({}, created.id);
			expect(result).toBe(true);
		});

		it("returns false for non-existent id", async () => {
			const handler = getHandler(IPC.CONNECTION_DELETE);
			const result = await handler({}, 999);
			expect(result).toBe(false);
		});
	});
});
