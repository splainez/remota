import { IPC } from "@shared/ipc-channels";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("electron", () => ({
	ipcMain: { handle: vi.fn() },
}));

vi.mock("@main/terminal/terminal-detector", () => ({
	detectInstalledTerminals: vi.fn().mockResolvedValue(["kitty"]),
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
		openExternalTerminal: vi.fn().mockReturnValue(Promise.resolve()),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		registerTerminalHandlers(mockManager as unknown as Parameters<typeof registerTerminalHandlers>[0]);
	});

	it("registers spawn, write, resize, kill, openExternal, and detectInstalled handlers", () => {
		const calls: unknown[][] = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls;
		const channels = calls.map((c) => c[0]);
		expect(channels).toContain(IPC.TERMINAL_SPAWN);
		expect(channels).toContain(IPC.TERMINAL_WRITE);
		expect(channels).toContain(IPC.TERMINAL_RESIZE);
		expect(channels).toContain(IPC.TERMINAL_KILL);
		expect(channels).toContain(IPC.TERMINAL_OPEN_EXTERNAL);
		expect(channels).toContain(IPC.TERMINAL_DETECT_INSTALLED);
		expect(calls.length).toBe(6);
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

	it("openExternal handler calls manager.openExternalTerminal with forwarded args", () => {
		const calls: unknown[][] = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls;
		const fn = calls.find((c) => c[0] === IPC.TERMINAL_OPEN_EXTERNAL)?.[1] as (
			event: unknown,
			...args: unknown[]
		) => void;
		fn({}, 7, "/home/user", "local");
		expect(mockManager.openExternalTerminal).toHaveBeenCalledWith(7, "/home/user", "local");
	});

	it("detectInstalled handler returns the result of detectInstalledTerminals", async () => {
		const calls: unknown[][] = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls;
		const fn = calls.find((c) => c[0] === IPC.TERMINAL_DETECT_INSTALLED)?.[1] as (event: unknown) => Promise<unknown>;
		const result = await fn({});
		expect(result).toEqual(["kitty"]);
	});
});
