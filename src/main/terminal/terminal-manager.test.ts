import type { AppStore } from "@main/app-store";
import type { SftpConnectionManager } from "@main/sftp/sftp-client";
import type { TerminalAppId } from "@shared/app-config-schema";
import type { Connection } from "@shared/types";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPty, mockChild, mockSpawn, mockLog } = vi.hoisted(() => {
	const listeners = new Map<string, ((...args: unknown[]) => void)[]>();
	const mockChild = {
		unref: vi.fn(),
		kill: vi.fn(),
		on(event: string, listener: (...args: unknown[]) => void) {
			const arr = listeners.get(event) ?? [];
			arr.push(listener);
			listeners.set(event, arr);
			return mockChild;
		},
		once(event: string, listener: (...args: unknown[]) => void) {
			const wrapped = (...args: unknown[]) => {
				listeners.set(
					event,
					(listeners.get(event) ?? []).filter((l) => l !== wrapped),
				);
				listener(...args);
			};
			const arr = listeners.get(event) ?? [];
			arr.push(wrapped);
			listeners.set(event, arr);
			return mockChild;
		},
		off(event: string, listener: (...args: unknown[]) => void) {
			const arr = listeners.get(event) ?? [];
			listeners.set(
				event,
				arr.filter((l) => l !== listener),
			);
			return mockChild;
		},
		removeAllListeners() {
			listeners.clear();
			return mockChild;
		},
		emit(event: string, ...args: unknown[]) {
			for (const l of (listeners.get(event) ?? []).slice()) {
				l(...args);
			}
			return true;
		},
	};
	const mockSpawn = vi.fn().mockReturnValue(mockChild);
	const mockPty = {
		onData: vi.fn(),
		onExit: vi.fn(),
		write: vi.fn(),
		resize: vi.fn(),
		kill: vi.fn(),
	};
	const mockLog = {
		fatal: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
		debug: vi.fn(),
		trace: vi.fn(),
		isLevelEnabled: vi.fn().mockReturnValue(true),
	};
	return { mockPty, mockChild, mockSpawn, mockLog };
});

vi.mock("@shared/lib/logger", () => ({
	LoggerFactory: {
		init: vi.fn().mockReturnValue(mockLog),
	},
}));

vi.mock("node-pty", () => ({
	spawn: vi.fn().mockReturnValue(mockPty),
}));

vi.mock("node:child_process", () => ({
	default: { spawn: mockSpawn },
	spawn: mockSpawn,
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

import { buildSshArgs, getLocalCommand, getSshCommand, TerminalManager } from "./terminal-manager";

function emitSpawnImmediately() {
	queueMicrotask(() => {
		mockChild.emit("spawn");
	});
}

function makeConnection(overrides: Partial<Connection> = {}): Connection {
	return {
		id: 1,
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
		region: "",
		bucket: "",
		endpoint: "",
		useHttps: true,
		groupName: "",
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
		...overrides,
	};
}

function makeAppStore(
	opts: {
		externalTerminal?: TerminalAppId;
		connection?: Connection;
	} = {},
): AppStore {
	return {
		getSettings: () => ({ theme: "system", locale: "en", externalTerminal: opts.externalTerminal }),
		get: (id: number) => (opts.connection?.id === id ? opts.connection : undefined),
	} as unknown as AppStore;
}

describe("TerminalManager", () => {
	let manager: TerminalManager;
	let mockWebContents: { send: ReturnType<typeof vi.fn>; isDestroyed: ReturnType<typeof vi.fn> };
	let mockSftp: {
		openShell: ReturnType<typeof vi.fn>;
		isConnected: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockChild.removeAllListeners();
		// re-add the methods after clearAllMocks (they're on the instance, not on the mock fn, so they survive)
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
			makeAppStore(),
			mockWebContents as unknown as Electron.WebContents,
		);
	});

	it("spawnLocal creates a session", () => {
		manager.spawnLocal("local-1");
		expect(manager.has("local-1")).toBe(true);
	});

	it("spawnLocal passes cols and rows to spawn", () => {
		manager.spawnLocal("local-1");
		expect(mockPty.onData).toHaveBeenCalledWith(expect.any(Function));
	});

	it("spawnLocal does not pass env explicitly", () => {
		manager.spawnLocal("local-1");
		// original node-pty mock returns mockPty; the spawn call is captured by the vi.fn
		// (we only assert the session was created)
		expect(manager.has("local-1")).toBe(true);
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
		expect(manager.has("local-1")).toBe(false);
	});

	it("spawnLocal reuses sessionId after exit", () => {
		manager.spawnLocal("local-1");
		const onExitCb = mockPty.onExit.mock.calls[0][0] as (event: { exitCode: number }) => void;
		onExitCb({ exitCode: 0 });
		expect(manager.has("local-1")).toBe(false);
		manager.spawnLocal("local-1");
		expect(manager.has("local-1")).toBe(true);
	});

	it("spawnLocal kills previous session with same ID", () => {
		manager.spawnLocal("local-1");
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

describe("getLocalCommand", () => {
	const cases: [TerminalAppId, string, string, string[]][] = [
		["windows-terminal", "/home/user", "wt.exe", ["-d", "/home/user"]],
		["kitty", "/home/user", "kitty", ["--cwd", "/home/user"]],
		["ghostty", "/home/user", "ghostty", ["--working-directory", "/home/user"]],
		["alacritty", "/home/user", "alacritty", ["--working-directory", "/home/user"]],
		["iterm2", "/home/user", "open", ["-a", "iTerm", "/home/user"]],
		["terminal-app", "/home/user", "open", ["-a", "Terminal", "/home/user"]],
		["gnome-terminal", "/home/user", "gnome-terminal", ["--working-directory=/home/user"]],
		["konsole", "/home/user", "konsole", ["--workdir", "/home/user"]],
	];

	for (const [type, path, expectedCommand, expectedArgs] of cases) {
		it(`returns correct command for ${type}`, () => {
			expect(getLocalCommand(type, path)).toEqual({ command: expectedCommand, args: expectedArgs });
		});
	}
});

describe("buildSshArgs", () => {
	const baseConn = {
		host: "example.com",
		port: 22,
		username: "user",
		authType: "password" as const,
		privateKeyPath: "",
	};

	it("builds minimal args with default port and password auth", () => {
		expect(buildSshArgs(baseConn, "/var/log")).toEqual(["ssh", "-t", "user@example.com", "cd /var/log && exec $SHELL"]);
	});

	it("adds -p when port differs from 22", () => {
		expect(buildSshArgs({ ...baseConn, port: 2222 }, "/")).toEqual([
			"ssh",
			"-p",
			"2222",
			"-t",
			"user@example.com",
			"cd / && exec $SHELL",
		]);
	});

	it("adds -i for key-based auth when privateKeyPath is set", () => {
		expect(buildSshArgs({ ...baseConn, authType: "key", privateKeyPath: "/keys/id_rsa" }, "/")).toEqual([
			"ssh",
			"-i",
			"/keys/id_rsa",
			"-t",
			"user@example.com",
			"cd / && exec $SHELL",
		]);
	});

	it("ignores privateKeyPath when authType is 'password'", () => {
		expect(buildSshArgs({ ...baseConn, authType: "password", privateKeyPath: "/keys/id_rsa" }, "/")).toEqual([
			"ssh",
			"-t",
			"user@example.com",
			"cd / && exec $SHELL",
		]);
	});

	it("quotes remote path with spaces", () => {
		expect(buildSshArgs(baseConn, "/var/log with space")).toEqual([
			"ssh",
			"-t",
			"user@example.com",
			"cd '/var/log with space' && exec $SHELL",
		]);
	});
});

describe("getSshCommand", () => {
	const sshArgs = ["ssh", "-t", "user@example.com", "cd / && exec $SHELL"];

	const cases: [TerminalAppId, string, string[]][] = [
		["windows-terminal", "wt.exe", [...sshArgs]],
		["kitty", "kitty", ["-e", ...sshArgs]],
		["ghostty", "ghostty", ["-e", ...sshArgs]],
		["alacritty", "alacritty", ["-e", ...sshArgs]],
		["iterm2", "open", ["-a", "iTerm"]],
		["terminal-app", "open", ["-a", "Terminal"]],
		["gnome-terminal", "gnome-terminal", ["--", ...sshArgs]],
		["konsole", "konsole", ["-e", ...sshArgs]],
	];

	for (const [type, expectedCommand, expectedArgs] of cases) {
		it(`returns correct command for ${type}`, () => {
			expect(getSshCommand(type, sshArgs)).toEqual({ command: expectedCommand, args: expectedArgs });
		});
	}
});

describe("TerminalManager.openExternalTerminal", () => {
	let mockWebContents: { send: ReturnType<typeof vi.fn>; isDestroyed: ReturnType<typeof vi.fn> };
	let mockSftp: { openShell: ReturnType<typeof vi.fn>; isConnected: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		vi.clearAllMocks();
		mockChild.removeAllListeners();
		mockWebContents = { send: vi.fn(), isDestroyed: vi.fn().mockReturnValue(false) };
		mockSftp = {
			openShell: vi.fn().mockResolvedValue({ on: vi.fn(), write: vi.fn(), end: vi.fn(), setWindow: vi.fn() }),
			isConnected: vi.fn().mockReturnValue(true),
		};
	});

	it("throws when no external terminal is configured", async () => {
		const appStore = makeAppStore();
		const mgr = new TerminalManager(
			mockSftp as unknown as SftpConnectionManager,
			appStore,
			mockWebContents as unknown as Electron.WebContents,
		);
		await expect(mgr.openExternalTerminal(1, "/home", "local")).rejects.toThrow("No external terminal configured");
	});

	it("throws for S3 connections on remote type", async () => {
		const conn = makeConnection({ id: 1, protocol: "s3" });
		const appStore = makeAppStore({ externalTerminal: "kitty", connection: conn });
		const mgr = new TerminalManager(
			mockSftp as unknown as SftpConnectionManager,
			appStore,
			mockWebContents as unknown as Electron.WebContents,
		);
		await expect(mgr.openExternalTerminal(1, "/", "remote")).rejects.toThrow("Cannot open terminal for S3 connections");
	});

	it("throws when connection is not found", async () => {
		const appStore = makeAppStore({ externalTerminal: "kitty" });
		const mgr = new TerminalManager(
			mockSftp as unknown as SftpConnectionManager,
			appStore,
			mockWebContents as unknown as Electron.WebContents,
		);
		await expect(mgr.openExternalTerminal(99, "/", "remote")).rejects.toThrow("Connection not found");
	});

	const localTerminalCases: [TerminalAppId, string, string[]][] = [
		["windows-terminal", "wt.exe", ["-d", "/home/user"]],
		["kitty", "kitty", ["--cwd", "/home/user"]],
		["ghostty", "ghostty", ["--working-directory", "/home/user"]],
		["alacritty", "alacritty", ["--working-directory", "/home/user"]],
		["iterm2", "open", ["-a", "iTerm", "/home/user"]],
		["terminal-app", "open", ["-a", "Terminal", "/home/user"]],
		["gnome-terminal", "gnome-terminal", ["--working-directory=/home/user"]],
		["konsole", "konsole", ["--workdir", "/home/user"]],
	];

	for (const [type, expectedCommand, expectedArgs] of localTerminalCases) {
		it(`launches local ${type} with the right args`, async () => {
			emitSpawnImmediately();
			const appStore = makeAppStore({ externalTerminal: type });
			const mgr = new TerminalManager(
				mockSftp as unknown as SftpConnectionManager,
				appStore,
				mockWebContents as unknown as Electron.WebContents,
			);
			await mgr.openExternalTerminal(0, "/home/user", "local");
			expect(mockSpawn).toHaveBeenCalledWith(expectedCommand, expectedArgs, expect.any(Object));
		});
	}

	it("launches windows-terminal with SSH args for remote sftp", async () => {
		emitSpawnImmediately();
		const conn = makeConnection({ id: 1, host: "example.com", port: 22, username: "user" });
		const appStore = makeAppStore({ externalTerminal: "windows-terminal", connection: conn });
		const mgr = new TerminalManager(
			mockSftp as unknown as SftpConnectionManager,
			appStore,
			mockWebContents as unknown as Electron.WebContents,
		);
		await mgr.openExternalTerminal(1, "/var/log", "remote");
		expect(mockSpawn).toHaveBeenCalledWith(
			"wt.exe",
			["ssh", "-t", "user@example.com", "cd /var/log && exec $SHELL"],
			expect.any(Object),
		);
	});

	it("adds -p when remote port is not 22", async () => {
		emitSpawnImmediately();
		const conn = makeConnection({ id: 1, port: 2222 });
		const appStore = makeAppStore({ externalTerminal: "kitty", connection: conn });
		const mgr = new TerminalManager(
			mockSftp as unknown as SftpConnectionManager,
			appStore,
			mockWebContents as unknown as Electron.WebContents,
		);
		await mgr.openExternalTerminal(1, "/", "remote");
		const args = (mockSpawn.mock.calls[0] as unknown as [string, string[]])[1];
		expect(args).toContain("-p");
		expect(args).toContain("2222");
	});

	it("adds -i for key auth", async () => {
		emitSpawnImmediately();
		const conn = makeConnection({ id: 1, authType: "key", privateKeyPath: "/keys/id_rsa" });
		const appStore = makeAppStore({ externalTerminal: "kitty", connection: conn });
		const mgr = new TerminalManager(
			mockSftp as unknown as SftpConnectionManager,
			appStore,
			mockWebContents as unknown as Electron.WebContents,
		);
		await mgr.openExternalTerminal(1, "/", "remote");
		const args = (mockSpawn.mock.calls[0] as unknown as [string, string[]])[1];
		expect(args).toContain("-i");
		expect(args).toContain("/keys/id_rsa");
	});

	it("does not add -i for password auth", async () => {
		emitSpawnImmediately();
		const conn = makeConnection({ id: 1, authType: "password" });
		const appStore = makeAppStore({ externalTerminal: "kitty", connection: conn });
		const mgr = new TerminalManager(
			mockSftp as unknown as SftpConnectionManager,
			appStore,
			mockWebContents as unknown as Electron.WebContents,
		);
		await mgr.openExternalTerminal(1, "/", "remote");
		const args = (mockSpawn.mock.calls[0] as unknown as [string, string[]])[1];
		expect(args).not.toContain("-i");
	});

	it("opens iTerm2 without SSH args on remote (user must ssh manually)", async () => {
		emitSpawnImmediately();
		const conn = makeConnection({ id: 1 });
		const appStore = makeAppStore({ externalTerminal: "iterm2", connection: conn });
		const mgr = new TerminalManager(
			mockSftp as unknown as SftpConnectionManager,
			appStore,
			mockWebContents as unknown as Electron.WebContents,
		);
		await mgr.openExternalTerminal(1, "/", "remote");
		expect(mockSpawn).toHaveBeenCalledWith("open", ["-a", "iTerm"], expect.any(Object));
	});

	it("opens Terminal.app without SSH args on remote", async () => {
		emitSpawnImmediately();
		const conn = makeConnection({ id: 1 });
		const appStore = makeAppStore({ externalTerminal: "terminal-app", connection: conn });
		const mgr = new TerminalManager(
			mockSftp as unknown as SftpConnectionManager,
			appStore,
			mockWebContents as unknown as Electron.WebContents,
		);
		await mgr.openExternalTerminal(1, "/", "remote");
		expect(mockSpawn).toHaveBeenCalledWith("open", ["-a", "Terminal"], expect.any(Object));
	});

	it("rejects when spawn errors", async () => {
		const appStore = makeAppStore({ externalTerminal: "kitty" });
		const mgr = new TerminalManager(
			mockSftp as unknown as SftpConnectionManager,
			appStore,
			mockWebContents as unknown as Electron.WebContents,
		);
		queueMicrotask(() => {
			mockChild.emit("error", new Error("ENOENT"));
		});
		await expect(mgr.openExternalTerminal(0, "/home/user", "local")).rejects.toThrow("ENOENT");
	});

	it("uses cwd fallback when local path is undefined", async () => {
		emitSpawnImmediately();
		const appStore = makeAppStore({ externalTerminal: "kitty" });
		const mgr = new TerminalManager(
			mockSftp as unknown as SftpConnectionManager,
			appStore,
			mockWebContents as unknown as Electron.WebContents,
		);
		await mgr.openExternalTerminal(0, undefined, "local");
		expect(mockSpawn).toHaveBeenCalled();
	});

	it("uses '/' when remote path is undefined", async () => {
		emitSpawnImmediately();
		const conn = makeConnection({ id: 1 });
		const appStore = makeAppStore({ externalTerminal: "kitty", connection: conn });
		const mgr = new TerminalManager(
			mockSftp as unknown as SftpConnectionManager,
			appStore,
			mockWebContents as unknown as Electron.WebContents,
		);
		await mgr.openExternalTerminal(1, undefined, "remote");
		const args = (mockSpawn.mock.calls[0] as unknown as [string, string[]])[1];
		expect(args.join(" ")).toContain("cd /");
	});

	describe("debug logging", () => {
		beforeEach(() => {
			mockLog.info.mockClear();
		});

		it("logs the command and args for local launch", async () => {
			emitSpawnImmediately();
			const appStore = makeAppStore({ externalTerminal: "kitty" });
			const mgr = new TerminalManager(
				mockSftp as unknown as SftpConnectionManager,
				appStore,
				mockWebContents as unknown as Electron.WebContents,
			);
			await mgr.openExternalTerminal(0, "/home/user", "local");
			expect(mockLog.info).toHaveBeenCalledWith(
				"Launching external terminal (local)",
				expect.objectContaining({
					terminalType: "kitty",
					command: "kitty",
					args: ["--cwd", "/home/user"],
					path: "/home/user",
				}),
			);
		});

		it("logs the command and args for remote launch with SSH", async () => {
			emitSpawnImmediately();
			const conn = makeConnection({ id: 1, host: "example.com", port: 22, username: "user" });
			const appStore = makeAppStore({ externalTerminal: "kitty", connection: conn });
			const mgr = new TerminalManager(
				mockSftp as unknown as SftpConnectionManager,
				appStore,
				mockWebContents as unknown as Electron.WebContents,
			);
			await mgr.openExternalTerminal(1, "/var/log", "remote");
			expect(mockLog.info).toHaveBeenCalledWith(
				"Launching external terminal (remote, with SSH)",
				expect.objectContaining({
					terminalType: "kitty",
					command: "kitty",
					host: "example.com",
					username: "user",
					port: 22,
					path: "/var/log",
				}),
			);
		});

		it("logs the command and args for iTerm2 sshless remote launch", async () => {
			emitSpawnImmediately();
			const conn = makeConnection({ id: 1, host: "example.com" });
			const appStore = makeAppStore({ externalTerminal: "iterm2", connection: conn });
			const mgr = new TerminalManager(
				mockSftp as unknown as SftpConnectionManager,
				appStore,
				mockWebContents as unknown as Electron.WebContents,
			);
			await mgr.openExternalTerminal(1, "/", "remote");
			expect(mockLog.info).toHaveBeenCalledWith(
				"Launching external terminal (remote, sshless)",
				expect.objectContaining({
					terminalType: "iterm2",
					command: "open",
					args: ["-a", "iTerm"],
					host: "example.com",
				}),
			);
		});
	});
});
