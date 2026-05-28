import { spawn, type IPty } from "node-pty";
import { existsSync } from "node:fs";
import type { WebContents } from "electron";
import type { ClientChannel } from "ssh2";
import type { SftpConnectionManager } from "../sftp/sftp-client";

type TerminalSession = IPtySession | RemoteShellSession;

interface IPtySession {
	type: "local";
	pty: IPty;
}

interface RemoteShellSession {
	type: "remote";
	stream: ClientChannel;
}

function getShell(): { file: string; args: string[] } {
	if (process.platform === "win32") {
		const pwshPath = "C:\\Program Files\\PowerShell\\7\\pwsh.exe";
		const psPath = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

		if (existsSync(pwshPath)) {
			return { file: pwshPath, args: ["-NoLogo"] };
		}
		if (existsSync(psPath)) {
			return { file: psPath, args: ["-NoLogo"] };
		}
		return { file: "cmd.exe", args: [] };
	}

	return { file: process.env.SHELL ?? "/bin/bash", args: [] };
}

export class TerminalManager {
	private sessions = new Map<string, TerminalSession>();
	private sftp: SftpConnectionManager;
	private webContents: WebContents;

	constructor(sftp: SftpConnectionManager, webContents: WebContents) {
		this.sftp = sftp;
		this.webContents = webContents;
	}

	spawnLocal(sessionId: string): void {
		if (this.sessions.has(sessionId)) {
			this.kill(sessionId);
		}

		const { file, args } = getShell();

		const pty = spawn(file, args, {
			name: "xterm-256color",
			cols: 80,
			rows: 24,
			cwd: process.env.HOME ?? process.env.USERPROFILE ?? "/",
		});

		this.sessions.set(sessionId, { type: "local", pty });

		pty.onData((data: string) => {
			if (!this.webContents.isDestroyed()) {
				this.webContents.send(`terminal:data:${sessionId}`, data);
			}
		});

		pty.onExit(({ exitCode }) => {
			if (!this.webContents.isDestroyed()) {
				this.webContents.send(`terminal:exit:${sessionId}`, exitCode);
			}
			this.sessions.delete(sessionId);
		});
	}

	async spawnRemote(sessionId: string, connectionId: number): Promise<void> {
		if (this.sessions.has(sessionId)) {
			this.kill(sessionId);
		}

		const stream = await this.sftp.openShell(connectionId);

		this.sessions.set(sessionId, { type: "remote", stream });

		stream.on("data", (data: Buffer) => {
			if (!this.webContents.isDestroyed()) {
				this.webContents.send(`terminal:data:${sessionId}`, data.toString("utf-8"));
			}
		});

		stream.on("close", (code: number | null) => {
			if (!this.webContents.isDestroyed()) {
				this.webContents.send(`terminal:exit:${sessionId}`, code);
			}
			this.sessions.delete(sessionId);
		});

		stream.on("error", () => {
			if (!this.webContents.isDestroyed()) {
				this.webContents.send(`terminal:exit:${sessionId}`, -1);
			}
			this.sessions.delete(sessionId);
		});
	}

	write(sessionId: string, data: string): void {
		const session = this.sessions.get(sessionId);
		if (!session) return;

		if (session.type === "local") {
			session.pty.write(data);
		} else {
			session.stream.write(data);
		}
	}

	resize(sessionId: string, cols: number, rows: number): void {
		const session = this.sessions.get(sessionId);
		if (!session) return;

		if (session.type === "local") {
			session.pty.resize(cols, rows);
		} else {
			session.stream.setWindow(rows, cols, 0, 0);
		}
	}

	kill(sessionId: string): void {
		const session = this.sessions.get(sessionId);
		if (!session) return;

		this.sessions.delete(sessionId);

		if (session.type === "local") {
			session.pty.kill();
		} else {
			session.stream.end();
		}
	}

	killAll(): void {
		for (const [id] of this.sessions) {
			this.kill(id);
		}
	}

	has(sessionId: string): boolean {
		return this.sessions.has(sessionId);
	}
}
