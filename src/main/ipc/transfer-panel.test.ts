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

import { registerTransferPanelHandlers } from "./transfer-panel";

// eslint-disable-next-line @typescript-eslint/unbound-method -- ipcMain.handle is mocked via vi.fn()
const mockHandle = ipcMain.handle as unknown as ReturnType<typeof vi.fn>;

function getHandler(channel: string): (...args: unknown[]) => unknown {
	for (const call of mockHandle.mock.calls as [string, (...a: unknown[]) => unknown][]) {
		if (call[0] === channel) return call[1];
	}
	throw new Error(`Handler not found for channel: ${channel}`);
}

describe("transfer panel IPC handlers", () => {
	let tmpDir: string;
	let store: AppStore;

	beforeEach(() => {
		vi.clearAllMocks();
		tmpDir = mkdtempSync(join(tmpdir(), "remota-tp-ipc-"));
		store = new AppStore(tmpDir);
		registerTransferPanelHandlers(store);
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("registers all transfer panel handlers", () => {
		const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls as [string, unknown][];
		const channels = calls.map((c) => c[0]);
		expect(channels).toContain(IPC.TRANSFER_PANEL_GET_ALL);
		expect(channels).toContain(IPC.TRANSFER_PANEL_SET);
	});

	describe("TRANSFER_PANEL_GET_ALL", () => {
		it("returns empty object when no entries", async () => {
			const handler = getHandler(IPC.TRANSFER_PANEL_GET_ALL);
			const result = (await handler()) as Record<number, { visible: boolean }>;
			expect(result).toEqual({});
		});

		it("returns all stored entries keyed by numeric id", async () => {
			store.setTransferPanel(1, { visible: true });
			store.setTransferPanel(2, { visible: false });

			const handler = getHandler(IPC.TRANSFER_PANEL_GET_ALL);
			const result = (await handler()) as Record<number, { visible: boolean }>;
			expect(result[1]).toEqual({ visible: true });
			expect(result[2]).toEqual({ visible: false });
		});
	});

	describe("TRANSFER_PANEL_SET", () => {
		it("stores visible true", async () => {
			const handler = getHandler(IPC.TRANSFER_PANEL_SET);
			await handler({}, 7, { visible: true });
			expect(store.getTransferPanel(7)).toEqual({ visible: true });
		});

		it("merges updates for an existing entry", async () => {
			store.setTransferPanel(3, { visible: true });
			const handler = getHandler(IPC.TRANSFER_PANEL_SET);
			await handler({}, 3, { visible: false });
			expect(store.getTransferPanel(3)).toEqual({ visible: false });
		});

		it("throws on invalid payload", () => {
			const handler = getHandler(IPC.TRANSFER_PANEL_SET);
			expect(() => handler({}, 1, { visible: "yes" })).toThrow("Invalid transfer panel data");
		});

		it("throws on empty update payload", () => {
			const handler = getHandler(IPC.TRANSFER_PANEL_SET);
			expect(() => handler({}, 1, {})).toThrow("must include at least one field");
		});
	});
});
