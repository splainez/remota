import type { SftpConnectionManager } from "@main/sftp/sftp-client";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPty } = vi.hoisted(() => ({
	mockPty: {
		onData: vi.fn(),
		onExit: vi.fn(),
		write: vi.fn(),
		resize: vi.fn(),
		kill: vi.fn(),
	},
}));

vi.mock("node-pty", () => ({
	spawn: vi.fn().mockReturnValue(mockPty),
}));

vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();
	return {
		...actual,
		existsSync: vi.fn().mockReturnValue(false),
	};
});

vi.mock("electron", () => ({
	ipcMain: { handle: vi.fn() },
}));

import { spawn } from "node-pty";

import { TerminalManager } from "./terminal-manager";

describe("TerminalManager", () => {
	let manager: TerminalManager;
	let mockWebContents: { send: ReturnType<typeof vi.fn>; isDestroyed: ReturnType<typeof vi.fn> };
	let mockSftp: {
		openShell: ReturnType<typeof vi.fn>;
		isConnected: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockWebContents = { send: vi.fn(), isDestroyed: vi.fn().mockReturnValue(false) };
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

	it("spawnLocal passes cols and rows to spawn", () => {
		manager.spawnLocal("local-1");
		expect(spawn).toHaveBeenCalledWith(
			expect.any(String),
			expect.any(Array),
			expect.objectContaining({ cols: 80, rows: 24 }),
		);
	});

	it("spawnLocal does not pass env explicitly", () => {
		manager.spawnLocal("local-1");
		const call = (spawn as ReturnType<typeof vi.fn>).mock.calls[0] as Parameters<typeof spawn>;
		const options = call[2];
		expect(options).not.toHaveProperty("env");
	});

	it("spawnLocal registers onData and onExit on PTY", () => {
		manager.spawnLocal("local-1");
		expect(mockPty.onData).toHaveBeenCalledWith(expect.any(Function));
		expect(mockPty.onExit).toHaveBeenCalledWith(expect.any(Function));
	});

	it("spawnLocal onData callback sends data to webContents", () => {
		manager.spawnLocal("local-1");
		const onDataCb = mockPty.onData.mock.calls[0][0] as (data: string) => void;
		onDataCb("hello world");
		expect(mockWebContents.send).toHaveBeenCalledWith("terminal:data:local-1", "hello world");
	});

	it("spawnLocal onExit callback sends exit code to webContents", () => {
		manager.spawnLocal("local-1");
		const onExitCb = mockPty.onExit.mock.calls[0][0] as (event: { exitCode: number }) => void;
		onExitCb({ exitCode: 0 });
		expect(mockWebContents.send).toHaveBeenCalledWith("terminal:exit:local-1", 0);
	});

	it("spawnLocal onExit callback reports exit and removes session", () => {
		manager.spawnLocal("local-1");
		const onExitCb = mockPty.onExit.mock.calls[0][0] as (event: { exitCode: number }) => void;
		onExitCb({ exitCode: 0 });
		// Also test that session is removed on exit
		expect(manager.has("local-1")).toBe(false);
	});

	it("spawnLocal reuses sessionId after exit", () => {
		manager.spawnLocal("local-1");
		const onExitCb = mockPty.onExit.mock.calls[0][0] as (event: { exitCode: number }) => void;
		onExitCb({ exitCode: 0 });
		expect(manager.has("local-1")).toBe(false);
		// Can spawn again with same ID
		manager.spawnLocal("local-1");
		expect(manager.has("local-1")).toBe(true);
	});

	it("spawnLocal kills previous session with same ID", () => {
		manager.spawnLocal("local-1");
		expect(mockPty.kill).not.toHaveBeenCalled();
		manager.spawnLocal("local-1");
		expect(mockPty.kill).toHaveBeenCalled();
	});

	it("spawnRemote opens shell and creates session", async () => {
		await manager.spawnRemote("remote-1", 1);
		expect(manager.has("remote-1")).toBe(true);
		expect(mockSftp.openShell).toHaveBeenCalledWith(1);
	});

	it("spawnRemote registers data and close handlers on stream", async () => {
		await manager.spawnRemote("remote-1", 1);
		const mockStream = (await mockSftp.openShell.mock.results[0].value) as {
			on: ReturnType<typeof vi.fn>;
			write: ReturnType<typeof vi.fn>;
			end: ReturnType<typeof vi.fn>;
			setWindow: ReturnType<typeof vi.fn>;
		};
		expect(mockStream.on).toHaveBeenCalledWith("data", expect.any(Function));
		expect(mockStream.on).toHaveBeenCalledWith("close", expect.any(Function));
	});

	it("spawnRemote data handler sends data to webContents", async () => {
		await manager.spawnRemote("remote-1", 1);
		const mockStream = (await mockSftp.openShell.mock.results[0].value) as {
			on: ReturnType<typeof vi.fn>;
			write: ReturnType<typeof vi.fn>;
			end: ReturnType<typeof vi.fn>;
			setWindow: ReturnType<typeof vi.fn>;
		};
		const dataCb = mockStream.on.mock.calls.find((c: unknown[]) => c[0] === "data")?.[1] as (data: Buffer) => void;
		dataCb(Buffer.from("remote output"));
		expect(mockWebContents.send).toHaveBeenCalledWith("terminal:data:remote-1", "remote output");
	});

	it("spawnRemote close handler cleans up session", async () => {
		await manager.spawnRemote("remote-1", 1);
		const mockStream = (await mockSftp.openShell.mock.results[0].value) as {
			on: ReturnType<typeof vi.fn>;
			write: ReturnType<typeof vi.fn>;
			end: ReturnType<typeof vi.fn>;
			setWindow: ReturnType<typeof vi.fn>;
		};
		const closeCb = mockStream.on.mock.calls.find((c: unknown[]) => c[0] === "close")?.[1] as (code: number) => void;
		closeCb(0);
		expect(manager.has("remote-1")).toBe(false);
	});

	it("write sends data to local PTY", () => {
		manager.spawnLocal("local-1");
		manager.write("local-1", "echo hello\r");
		expect(mockPty.write).toHaveBeenCalledWith("echo hello\r");
	});

	it("write sends data to remote stream", async () => {
		await manager.spawnRemote("remote-1", 1);
		const mockStream = (await mockSftp.openShell.mock.results[0].value) as {
			on: ReturnType<typeof vi.fn>;
			write: ReturnType<typeof vi.fn>;
			end: ReturnType<typeof vi.fn>;
			setWindow: ReturnType<typeof vi.fn>;
		};
		manager.write("remote-1", "ls\r");
		expect(mockStream.write).toHaveBeenCalledWith("ls\r");
	});

	it("write does nothing for unknown session", () => {
		manager.write("unknown", "data");
		expect(mockPty.write).not.toHaveBeenCalled();
	});

	it("resize calls pty.resize on local session", () => {
		manager.spawnLocal("local-1");
		manager.resize("local-1", 120, 40);
		expect(mockPty.resize).toHaveBeenCalledWith(120, 40);
	});

	it("resize calls stream.setWindow on remote session", async () => {
		await manager.spawnRemote("remote-1", 1);
		const mockStream = (await mockSftp.openShell.mock.results[0].value) as {
			on: ReturnType<typeof vi.fn>;
			write: ReturnType<typeof vi.fn>;
			end: ReturnType<typeof vi.fn>;
			setWindow: ReturnType<typeof vi.fn>;
		};
		manager.resize("remote-1", 100, 30);
		expect(mockStream.setWindow).toHaveBeenCalledWith(30, 100, 0, 0);
	});

	it("resize does nothing for unknown session", () => {
		manager.resize("unknown", 80, 24);
		expect(mockPty.resize).not.toHaveBeenCalled();
	});

	it("kill stops local PTY and removes session", () => {
		manager.spawnLocal("local-1");
		manager.kill("local-1");
		expect(mockPty.kill).toHaveBeenCalled();
		expect(manager.has("local-1")).toBe(false);
	});

	it("kill ends remote stream and removes session", async () => {
		await manager.spawnRemote("remote-1", 1);
		const mockStream = (await mockSftp.openShell.mock.results[0].value) as {
			on: ReturnType<typeof vi.fn>;
			write: ReturnType<typeof vi.fn>;
			end: ReturnType<typeof vi.fn>;
			setWindow: ReturnType<typeof vi.fn>;
		};
		manager.kill("remote-1");
		expect(mockStream.end).toHaveBeenCalled();
		expect(manager.has("remote-1")).toBe(false);
	});

	it("kill does nothing for unknown session", () => {
		manager.kill("unknown");
		expect(mockPty.kill).not.toHaveBeenCalled();
	});

	it("killAll removes all sessions", () => {
		manager.spawnLocal("local-1");
		manager.spawnLocal("local-2");
		manager.killAll();
		expect(manager.has("local-1")).toBe(false);
		expect(manager.has("local-2")).toBe(false);
		expect(mockPty.kill).toHaveBeenCalledTimes(2);
	});

	it("has returns true for existing session", () => {
		manager.spawnLocal("local-1");
		expect(manager.has("local-1")).toBe(true);
	});

	it("has returns false for unknown session", () => {
		expect(manager.has("unknown")).toBe(false);
	});

	it("spawnLocal onData does not send when webContents is destroyed", () => {
		mockWebContents.isDestroyed.mockReturnValue(true);
		manager.spawnLocal("local-1");
		const onDataCb = mockPty.onData.mock.calls[0][0] as (data: string) => void;
		onDataCb("hello");
		expect(mockWebContents.send).not.toHaveBeenCalled();
	});

	it("spawnLocal onExit does not send when webContents is destroyed", () => {
		mockWebContents.isDestroyed.mockReturnValue(true);
		manager.spawnLocal("local-1");
		const onExitCb = mockPty.onExit.mock.calls[0][0] as (event: { exitCode: number }) => void;
		onExitCb({ exitCode: 0 });
		expect(mockWebContents.send).not.toHaveBeenCalled();
		expect(manager.has("local-1")).toBe(false);
	});

	it("spawnRemote data handler does not send when webContents is destroyed", async () => {
		mockWebContents.isDestroyed.mockReturnValue(true);
		await manager.spawnRemote("remote-1", 1);
		const mockStream = (await mockSftp.openShell.mock.results[0].value) as {
			on: ReturnType<typeof vi.fn>;
			write: ReturnType<typeof vi.fn>;
			end: ReturnType<typeof vi.fn>;
			setWindow: ReturnType<typeof vi.fn>;
		};
		const dataCb = mockStream.on.mock.calls.find((c: unknown[]) => c[0] === "data")?.[1] as (data: Buffer) => void;
		dataCb(Buffer.from("remote output"));
		expect(mockWebContents.send).not.toHaveBeenCalled();
	});

	it("spawnRemote close handler does not send when webContents is destroyed", async () => {
		mockWebContents.isDestroyed.mockReturnValue(true);
		await manager.spawnRemote("remote-1", 1);
		const mockStream = (await mockSftp.openShell.mock.results[0].value) as {
			on: ReturnType<typeof vi.fn>;
			write: ReturnType<typeof vi.fn>;
			end: ReturnType<typeof vi.fn>;
			setWindow: ReturnType<typeof vi.fn>;
		};
		const closeCb = mockStream.on.mock.calls.find((c: unknown[]) => c[0] === "close")?.[1] as (code: number) => void;
		closeCb(0);
		expect(mockWebContents.send).not.toHaveBeenCalled();
		expect(manager.has("remote-1")).toBe(false);
	});
});
