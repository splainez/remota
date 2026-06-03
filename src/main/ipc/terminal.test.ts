import { IPC } from "@shared/ipc-channels";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("electron", () => ({
	ipcMain: { handle: vi.fn() },
}));

import { ipcMain } from "electron";

import { registerTerminalHandlers } from "./terminal";

describe("registerTerminalHandlers", () => {
	const mockManager = {
		spawnLocal: vi.fn(),
		spawnRemote: vi.fn().mockReturnValue(Promise.resolve()),
		write: vi.fn(),
		resize: vi.fn(),
		kill: vi.fn(),
		killAll: vi.fn(),
		has: vi.fn().mockReturnValue(false),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		registerTerminalHandlers(mockManager as unknown as Parameters<typeof registerTerminalHandlers>[0]);
	});

	it("registers spawn, write, resize, and kill handlers", () => {
		const calls: unknown[][] = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls;
		const channels = calls.map((c) => c[0]);
		expect(channels).toContain(IPC.TERMINAL_SPAWN);
		expect(channels).toContain(IPC.TERMINAL_WRITE);
		expect(channels).toContain(IPC.TERMINAL_RESIZE);
		expect(channels).toContain(IPC.TERMINAL_KILL);
		expect(calls.length).toBe(4);
	});

	it("spawn handler calls spawnLocal for local type", () => {
		const calls: unknown[][] = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls;
		const fn = calls.find((c) => c[0] === IPC.TERMINAL_SPAWN)?.[1] as (event: unknown, ...args: unknown[]) => void;
		fn({}, "local-1", "local");
		expect(mockManager.spawnLocal).toHaveBeenCalledWith("local-1");
	});

	it("spawn handler calls spawnRemote for remote type with connectionId", () => {
		const calls: unknown[][] = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls;
		const fn = calls.find((c) => c[0] === IPC.TERMINAL_SPAWN)?.[1] as (event: unknown, ...args: unknown[]) => void;
		fn({}, "remote-5", "remote", 5);
		expect(mockManager.spawnRemote).toHaveBeenCalledWith("remote-5", 5);
	});

	it("write handler calls manager.write", () => {
		const calls: unknown[][] = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls;
		const fn = calls.find((c) => c[0] === IPC.TERMINAL_WRITE)?.[1] as (event: unknown, ...args: unknown[]) => void;
		fn({}, "local-1", "echo hello\r");
		expect(mockManager.write).toHaveBeenCalledWith("local-1", "echo hello\r");
	});

	it("resize handler calls manager.resize", () => {
		const calls: unknown[][] = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls;
		const fn = calls.find((c) => c[0] === IPC.TERMINAL_RESIZE)?.[1] as (event: unknown, ...args: unknown[]) => void;
		fn({}, "local-1", 120, 40);
		expect(mockManager.resize).toHaveBeenCalledWith("local-1", 120, 40);
	});

	it("kill handler calls manager.kill", () => {
		const calls: unknown[][] = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls;
		const fn = calls.find((c) => c[0] === IPC.TERMINAL_KILL)?.[1] as (event: unknown, ...args: unknown[]) => void;
		fn({}, "local-1");
		expect(mockManager.kill).toHaveBeenCalledWith("local-1");
	});
});
