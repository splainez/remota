import { IPC } from "@shared/ipc-channels";
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("electron", () => ({
	ipcMain: { handle: vi.fn() },
}));

import type { RemoteEditManager } from "@main/remote-edit/remote-edit-manager";
import { ipcMain } from "electron";

import { registerRemoteEditHandlers } from "./remote-edit";

// eslint-disable-next-line @typescript-eslint/unbound-method -- ipcMain.handle is mocked via vi.fn()
const mockHandle = ipcMain.handle as unknown as ReturnType<typeof vi.fn>;

function getHandler(channel: string): (...args: unknown[]) => unknown {
	for (const call of mockHandle.mock.calls as [string, (...a: unknown[]) => unknown][]) {
		if (call[0] === channel) return call[1];
	}
	throw new Error(`Handler not found for channel: ${channel}`);
}

function makeManager(): RemoteEditManager {
	return {
		startEdit: vi.fn().mockResolvedValue({ tempPath: "/tmp/file" }),
		stopEdit: vi.fn(),
	} as unknown as RemoteEditManager;
}

describe("remote edit IPC handlers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("registers both remote edit handlers", () => {
		const manager = makeManager();
		registerRemoteEditHandlers(manager);
		const calls = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls as [string, unknown][];
		const channels = calls.map((c) => c[0]);
		expect(channels).toContain(IPC.REMOTE_EDIT_START);
		expect(channels).toContain(IPC.REMOTE_EDIT_STOP);
	});

	describe("REMOTE_EDIT_START", () => {
		it("calls manager.startEdit with validated params", async () => {
			const manager = makeManager();
			registerRemoteEditHandlers(manager);
			const handler = getHandler(IPC.REMOTE_EDIT_START);

			const result = (await handler({}, 1, "/remote/file.txt")) as { tempPath: string };
			// eslint-disable-next-line @typescript-eslint/unbound-method -- manager is a mock
			expect(manager.startEdit).toHaveBeenCalledWith(1, "/remote/file.txt", { watch: true });
			expect(result).toEqual({ tempPath: "/tmp/file" });
		});

		it("throws on missing connectionId", async () => {
			const manager = makeManager();
			registerRemoteEditHandlers(manager);
			const handler = getHandler(IPC.REMOTE_EDIT_START);

			await expect(handler({}, undefined, "/file")).rejects.toThrow("Invalid remote edit params");
		});

		it("throws on empty remotePath", async () => {
			const manager = makeManager();
			registerRemoteEditHandlers(manager);
			const handler = getHandler(IPC.REMOTE_EDIT_START);

			await expect(handler({}, 1, "")).rejects.toThrow("Invalid remote edit params");
		});
	});

	describe("REMOTE_EDIT_STOP", () => {
		it("calls manager.stopEdit with validated params", () => {
			const manager = makeManager();
			registerRemoteEditHandlers(manager);
			const handler = getHandler(IPC.REMOTE_EDIT_STOP);

			handler({}, 1, "/remote/file.txt");
			// eslint-disable-next-line @typescript-eslint/unbound-method -- manager is a mock
			expect(manager.stopEdit).toHaveBeenCalledWith(1, "/remote/file.txt");
		});

		it("throws on missing connectionId", () => {
			const manager = makeManager();
			registerRemoteEditHandlers(manager);
			const handler = getHandler(IPC.REMOTE_EDIT_STOP);

			expect(() => handler({}, undefined, "/file")).toThrow("Invalid remote edit params");
		});

		it("throws on empty remotePath", () => {
			const manager = makeManager();
			registerRemoteEditHandlers(manager);
			const handler = getHandler(IPC.REMOTE_EDIT_STOP);

			expect(() => handler({}, 1, "")).toThrow("Invalid remote edit params");
		});
	});
});
