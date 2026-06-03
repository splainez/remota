import { spawn as spawnProcess } from "node:child_process";
import { existsSync } from "node:fs";

import type { AppStore } from "@main/app-store";
import type { SftpConnectionManager } from "@main/sftp/sftp-client";
import type { TerminalAppId } from "@shared/app-config-schema";
import { LoggerFactory } from "@shared/lib/logger";
import type { WebContents } from "electron";
import { spawn, type IPty } from "node-pty";
import type { ClientChannel } from "ssh2";

const log = LoggerFactory.init({ name: "main.terminal" });

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

export interface SshCommandOptions {
	host: string;
	port: number;
	username: string;
	authType: "password" | "key" | "agent";
	privateKeyPath: string;
}

export function getLocalCommand(terminalType: TerminalAppId, localPath: string): { command: string; args: string[] } {
	switch (terminalType) {
		case "windows-terminal":
			return { command: "wt.exe", args: ["-d", localPath] };
		case "kitty":
			return { command: "kitty", args: ["--cwd", localPath] };
		case "ghostty":
			return { command: "ghostty", args: ["--working-directory", localPath] };
		case "alacritty":
			return { command: "alacritty", args: ["--working-directory", localPath] };
		case "iterm2":
			return { command: "open", args: ["-a", "iTerm", localPath] };
		case "terminal-app":
			return { command: "open", args: ["-a", "Terminal", localPath] };
		case "gnome-terminal":
			return { command: "gnome-terminal", args: [`--working-directory=${localPath}`] };
		case "konsole":
			return { command: "konsole", args: ["--workdir", localPath] };
	}
}

export function buildSshArgs(conn: SshCommandOptions, remotePath: string): string[] {
	const args = ["ssh"];

	if (conn.port !== 22) {
		args.push("-p", String(conn.port));
	}

	if (conn.authType === "key" && conn.privateKeyPath) {
		args.push("-i", conn.privateKeyPath);
	}

	args.push("-t", `${conn.username}@${conn.host}`, `cd ${shellQuote(remotePath)} && exec $SHELL`);

	return args;
}

function shellQuote(value: string): string {
	if (value === "") return "''";
	if (/^[A-Za-z0-9_./-]+$/.test(value)) return value;
	return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function getSshCommand(terminalType: TerminalAppId, sshArgs: string[]): { command: string; args: string[] } {
	switch (terminalType) {
		case "windows-terminal":
			return { command: "wt.exe", args: [...sshArgs] };
		case "kitty":
			return { command: "kitty", args: ["-e", ...sshArgs] };
		case "ghostty":
			return { command: "ghostty", args: ["-e", ...sshArgs] };
		case "alacritty":
			return { command: "alacritty", args: ["-e", ...sshArgs] };
		case "iterm2":
			return { command: "open", args: ["-a", "iTerm"] };
		case "terminal-app":
			return { command: "open", args: ["-a", "Terminal"] };
		case "gnome-terminal":
			return { command: "gnome-terminal", args: ["--", ...sshArgs] };
		case "konsole":
			return { command: "konsole", args: ["-e", ...sshArgs] };
	}
}

function spawnAsync(command: string, args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		let settled = false;
		const child = spawnProcess(command, args, {
			detached: true,
			stdio: "ignore",
		});

		const finish = () => {
			if (settled) return;
			settled = true;
			child.unref();
		};

		child.once("error", (error) => {
			finish();
			reject(error);
		});

		child.once("spawn", () => {
			finish();
			resolve();
		});

		setTimeout(() => {
			if (settled) return;
			settled = true;
			child.unref();
			resolve();
		}, 5000);
	});
}

export class TerminalManager {
	private sessions = new Map<string, TerminalSession>();
	private sftp: SftpConnectionManager;
	private appStore: AppStore;
	private webContents: WebContents;

	constructor(sftp: SftpConnectionManager, appStore: AppStore, webContents: WebContents) {
		this.sftp = sftp;
		this.appStore = appStore;
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

	async openExternalTerminal(connectionId: number, path: string | undefined, type: "local" | "remote"): Promise<void> {
		const settings = this.appStore.getSettings();
		const terminalType = settings.externalTerminal;

		if (!terminalType) {
			throw new Error("No external terminal configured");
		}

		if (type === "remote") {
			const connection = this.appStore.get(connectionId);
			if (!connection) {
				throw new Error("Connection not found");
			}

			if (connection.protocol === "s3") {
				throw new Error("Cannot open terminal for S3 connections");
			}

			if (terminalType === "iterm2" || terminalType === "terminal-app") {
				const { command, args } = getSshCommand(terminalType, []);
				log.info("Launching external terminal (remote, sshless)", {
					terminalType,
					command,
					args,
					connectionId,
					host: connection.host,
				});
				try {
					await spawnAsync(command, args);
				} catch (error) {
					log.error("Failed to launch external terminal", { error });
					throw error;
				}
				return;
			}

			const sshArgs = buildSshArgs(
				{
					host: connection.host,
					port: connection.port,
					username: connection.username,
					authType: connection.authType,
					privateKeyPath: connection.privateKeyPath,
				},
				path ?? "/",
			);
			const { command, args } = getSshCommand(terminalType, sshArgs);
			log.info("Launching external terminal (remote, with SSH)", {
				terminalType,
				command,
				args,
				connectionId,
				host: connection.host,
				username: connection.username,
				port: connection.port,
				path: path ?? "/",
			});
			try {
				await spawnAsync(command, args);
			} catch (error) {
				log.error("Failed to launch external terminal with SSH", { error });
				throw error;
			}
			return;
		}

		const localPath = path ?? process.env.HOME ?? process.env.USERPROFILE ?? "/";
		const { command, args } = getLocalCommand(terminalType, localPath);
		log.info("Launching external terminal (local)", {
			terminalType,
			command,
			args,
			path: localPath,
		});
		try {
			await spawnAsync(command, args);
		} catch (error) {
			log.error("Failed to launch external local terminal", { error });
			throw error;
		}
	}
}
