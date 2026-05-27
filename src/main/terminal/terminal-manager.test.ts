import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SftpConnectionManager } from "../sftp/sftp-client";

vi.mock("node-pty", () => ({
	spawn: vi.fn().mockReturnValue({
		onData: vi.fn(),
		onExit: vi.fn(),
		write: vi.fn(),
		resize: vi.fn(),
		kill: vi.fn(),
	}),
}));

vi.mock("electron", () => ({
	ipcMain: { handle: vi.fn() },
}));

import { TerminalManager } from "./terminal-manager";

describe("TerminalManager", () => {
	let manager: TerminalManager;
	let mockWebContents: { send: ReturnType<typeof vi.fn> };
	let mockSftp: {
		openShell: ReturnType<typeof vi.fn>;
		isConnected: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockWebContents = { send: vi.fn() };
		mockSftp = {
			openShell: vi.fn().mockResolvedValue({
				on: vi.fn(),
				write: vi.fn(),
				end: vi.fn(),
				setWindow: vi.fn(),
			}),
			isConnected: vi.fn().mockReturnValue(true),
		};

		manager = new TerminalManager(
			mockSftp as unknown as SftpConnectionManager,
			mockWebContents as unknown as Electron.WebContents,
		);
	});

	it("spawnLocal creates a session", () => {
		manager.spawnLocal("local-1");
		expect(manager.has("local-1")).toBe(true);
	});

	it("spawnRemote opens shell and creates session", async () => {
		await manager.spawnRemote("remote-1", 1);
		expect(manager.has("remote-1")).toBe(true);
		expect(mockSftp.openShell).toHaveBeenCalledWith(1);
	});

	it("write does not throw for valid session", () => {
		manager.spawnLocal("local-1");
		manager.write("local-1", "echo hello\r");
	});

	it("write does not throw for unknown session", () => {
		manager.write("unknown", "data");
	});

	it("resize does not throw for valid session", () => {
		manager.spawnLocal("local-1");
		manager.resize("local-1", 120, 40);
	});

	it("kill removes session", () => {
		manager.spawnLocal("local-1");
		manager.kill("local-1");
		expect(manager.has("local-1")).toBe(false);
	});

	it("killAll removes all sessions", () => {
		manager.spawnLocal("local-1");
		manager.spawnLocal("local-2");
		manager.killAll();
		expect(manager.has("local-1")).toBe(false);
		expect(manager.has("local-2")).toBe(false);
	});

	it("has returns true for existing session", () => {
		manager.spawnLocal("local-1");
		expect(manager.has("local-1")).toBe(true);
	});

	it("has returns false for unknown session", () => {
		expect(manager.has("unknown")).toBe(false);
	});

	it("kill does nothing for unknown session", () => {
		manager.kill("unknown");
	});

	it("resize does nothing for unknown session", () => {
		manager.resize("unknown", 80, 24);
	});
});
