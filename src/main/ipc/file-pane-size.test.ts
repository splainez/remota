import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { AppStore } from "@main/app-store";
import { IPC } from "@shared/ipc-channels";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("electron", () => ({
	ipcMain: { handle: vi.fn() },
}));

import { ipcMain } from "electron";

import { registerFilePaneSizeHandlers } from "./file-pane-size";

// eslint-disable-next-line @typescript-eslint/unbound-method -- ipcMain.handle is mocked via vi.fn()
const mockHandle = ipcMain.handle as unknown as ReturnType<typeof vi.fn>;

function getHandler(channel: string): (...args: unknown[]) => unknown {
	for (const call of mockHandle.mock.calls as [string, (...a: unknown[]) => unknown][]) {
		if (call[0] === channel) return call[1];
	}
	throw new Error(`Handler not found for channel: ${channel}`);
}

describe("file pane size IPC handlers", () => {
	let tmpDir: string;
	let store: AppStore;

	beforeEach(() => {
		vi.clearAllMocks();
		tmpDir = mkdtempSync(join(tmpdir(), "remota-fps-ipc-"));
		store = new AppStore(tmpDir);
		registerFilePaneSizeHandlers(store);
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("registers all file pane size handlers", () => {
		const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls as [string, unknown][];
		const channels = calls.map((c) => c[0]);
		expect(channels).toContain(IPC.FILE_PANE_SIZE_GET_ALL);
		expect(channels).toContain(IPC.FILE_PANE_SIZE_SET);
	});

	describe("FILE_PANE_SIZE_GET_ALL", () => {
		it("returns empty object when no entries", async () => {
			const handler = getHandler(IPC.FILE_PANE_SIZE_GET_ALL);
			const result = (await handler()) as Record<number, { localSize: number }>;
			expect(result).toEqual({});
		});

		it("returns all stored entries keyed by numeric id", async () => {
			store.setFilePaneSize(1, { localSize: 70 });
			store.setFilePaneSize(2, { localSize: 30 });

			const handler = getHandler(IPC.FILE_PANE_SIZE_GET_ALL);
			const result = (await handler()) as Record<number, { localSize: number }>;
			expect(result[1]).toEqual({ localSize: 70 });
			expect(result[2]).toEqual({ localSize: 30 });
		});
	});

	describe("FILE_PANE_SIZE_SET", () => {
		it("stores localSize", async () => {
			const handler = getHandler(IPC.FILE_PANE_SIZE_SET);
			await handler({}, 7, { localSize: 60 });
			expect(store.getFilePaneSize(7)).toEqual({ localSize: 60 });
		});

		it("merges updates for an existing entry", async () => {
			store.setFilePaneSize(3, { localSize: 70 });
			const handler = getHandler(IPC.FILE_PANE_SIZE_SET);
			await handler({}, 3, { localSize: 40 });
			expect(store.getFilePaneSize(3)).toEqual({ localSize: 40 });
		});

		it("throws on invalid payload", () => {
			const handler = getHandler(IPC.FILE_PANE_SIZE_SET);
			expect(() => handler({}, 1, { localSize: "yes" })).toThrow("Invalid file pane size data");
		});

		it("throws on empty update payload", () => {
			const handler = getHandler(IPC.FILE_PANE_SIZE_SET);
			expect(() => handler({}, 1, {})).toThrow("must include at least one field");
		});
	});
});
