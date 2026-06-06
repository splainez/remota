import { readFileSync, mkdirSync, createWriteStream } from "node:fs";
import { dirname } from "node:path";

import { tempManager } from "@main/temp/temp-manager";
import type { FileEntry } from "@shared/types";
import { Client, type SFTPWrapper, type ConnectConfig, type ClientChannel } from "ssh2";

interface SftpSession {
	client: Client;
	sftp: SFTPWrapper;
	connectionId: number;
}

export class SftpConnectionManager {
	private sessions = new Map<number, SftpSession>();

	async connect(
		connectionId: number,
		config: {
			host: string;
			port: number;
			username: string;
			authType: "password" | "key" | "agent";
			password?: string;
			privateKeyPath?: string;
		},
	): Promise<string> {
		if (this.sessions.has(connectionId)) {
			await this.disconnect(connectionId);
		}

		const client = new Client();

		const sshConfig: ConnectConfig = {
			host: config.host,
			port: config.port,
			username: config.username,
			readyTimeout: 10_000,
			keepaliveInterval: 30_000,
		};

		if (config.authType === "password") {
			sshConfig.password = config.password ?? "";
		} else if (config.authType === "key") {
			if (!config.privateKeyPath) {
				throw new Error("Private key path is required for key authentication");
			}
			const keyContent = readFileSync(config.privateKeyPath, "utf-8");
			sshConfig.privateKey = keyContent;
		} else {
			sshConfig.agent = process.env.SSH_AUTH_SOCK ?? undefined;
		}

		return new Promise<string>((resolve, reject) => {
			client.on("ready", () => {
				client.sftp((err, sftp) => {
					if (err) {
						client.end();
						reject(new Error(`SFTP subsystem error: ${err.message}`));
						return;
					}

					this.sessions.set(connectionId, { client, sftp, connectionId });

					tempManager
						.createTempDir(connectionId)
						.then(() => {
							sftp.realpath(".", (realpathErr, absPath) => {
								if (realpathErr) {
									resolve("/");
								} else {
									resolve(absPath);
								}
							});
						})
						.catch((tempErr: unknown) => {
							client.end();
							reject(
								new Error(
									`Failed to create temp directory: ${tempErr instanceof Error ? tempErr.message : String(tempErr)}`,
								),
							);
						});
				});
			});

			client.on("error", (err) => {
				reject(new Error(`SSH connection error: ${err.message}`));
			});

			client.connect(sshConfig);
		});
	}

	async disconnect(connectionId: number): Promise<void> {
		const session = this.sessions.get(connectionId);
		if (!session) return;

		await tempManager.removeTempDir(connectionId);

		return new Promise<void>((resolve) => {
			session.client.end();
			this.sessions.delete(connectionId);
			resolve();
		});
	}

	disconnectAll(): void {
		for (const [id] of this.sessions) {
			void this.disconnect(id);
		}
	}

	isConnected(connectionId: number): boolean {
		return this.sessions.has(connectionId);
	}

	async listDirectory(connectionId: number, path: string): Promise<FileEntry[]> {
		const session = this.sessions.get(connectionId);
		if (!session) {
			throw new Error("Not connected to remote server");
		}

		return new Promise<FileEntry[]>((resolve, reject) => {
			session.sftp.readdir(path, (err, list) => {
				if (err) {
					reject(new Error(`Failed to list directory: ${err.message}`));
					return;
				}

				const entries: FileEntry[] = list
					.filter((entry) => entry.filename !== "." && entry.filename !== "..")
					.map((entry) => ({
						name: entry.filename,
						fullPath: `${path}/${entry.filename}`,
						isDirectory: entry.attrs.isDirectory(),
						size: entry.attrs.size,
						modified: new Date(entry.attrs.mtime * 1000).toISOString(),
					}));

				resolve(entries);
			});
		});
	}

	async deletePath(connectionId: number, remotePath: string): Promise<void> {
		const session = this.sessions.get(connectionId);
		if (!session) {
			throw new Error("Not connected to remote server");
		}

		const isDir = await new Promise<boolean>((resolve) => {
			session.sftp.stat(remotePath, (err, stats) => {
				resolve(!err && stats.isDirectory());
			});
		});

		if (!isDir) {
			return new Promise<void>((resolve, reject) => {
				session.sftp.unlink(remotePath, (err) => {
					if (err) {
						reject(new Error(`Failed to delete file: ${err.message}`));
					} else {
						resolve();
					}
				});
			});
		}

		const entries = await new Promise<string[]>((resolve, reject) => {
			session.sftp.readdir(remotePath, (err, list) => {
				if (err) {
					reject(new Error(`Failed to read directory: ${err.message}`));
					return;
				}
				resolve(list.filter((e) => e.filename !== "." && e.filename !== "..").map((e) => e.filename));
			});
		});

		for (const name of entries) {
			const childPath = remotePath.endsWith("/") ? `${remotePath}${name}` : `${remotePath}/${name}`;
			await this.deletePath(connectionId, childPath);
		}

		return new Promise<void>((resolve, reject) => {
			session.sftp.rmdir(remotePath, (err) => {
				if (err) {
					reject(new Error(`Failed to remove directory: ${err.message}`));
				} else {
					resolve();
				}
			});
		});
	}

	async homeDir(connectionId: number): Promise<string> {
		const session = this.sessions.get(connectionId);
		if (!session) {
			throw new Error("Not connected to remote server");
		}

		return new Promise<string>((resolve) => {
			session.sftp.realpath(".", (err, absPath) => {
				resolve(err ? "/" : absPath);
			});
		});
	}

	async openShell(connectionId: number): Promise<ClientChannel> {
		const session = this.sessions.get(connectionId);
		if (!session) {
			throw new Error("Not connected to remote server");
		}

		return new Promise<ClientChannel>((resolve, reject) => {
			session.client.shell({ term: "xterm-256color", cols: 80, rows: 24 }, (err, stream) => {
				if (err) {
					reject(new Error(`Failed to open shell: ${err.message}`));
					return;
				}
				resolve(stream);
			});
		});
	}

	async downloadFile(
		connectionId: number,
		remotePath: string,
		localPath: string,
		onProgress?: (transferredBytes: number) => void,
		signal?: AbortSignal,
	): Promise<void> {
		const session = this.sessions.get(connectionId);
		if (!session) {
			throw new Error("Not connected to remote server");
		}

		const dir = dirname(localPath);
		mkdirSync(dir, { recursive: true });

		return new Promise<void>((resolve, reject) => {
			const writeStream = createWriteStream(localPath);
			let settled = false;
			let transferred = 0;

			const fail = (err: Error): void => {
				if (settled) return;
				settled = true;
				readStream.destroy();
				writeStream.destroy();
				reject(err);
			};

			writeStream.on("error", (err) => {
				fail(new Error(`Failed to write local file: ${err.message}`));
			});

			const readStream = session.sftp.createReadStream(remotePath, { highWaterMark: 64 * 1024 });
			readStream.on("error", (err: Error) => {
				fail(new Error(`Failed to read remote file: ${err.message}`));
			});

			readStream.on("data", (chunk: Buffer) => {
				transferred += chunk.length;
				if (onProgress) {
					onProgress(transferred);
				}
			});

			if (signal) {
				signal.addEventListener(
					"abort",
					() => {
						if (!settled) {
							settled = true;
							readStream.destroy();
							writeStream.destroy();
							reject(new DOMException("Aborted", "AbortError"));
						}
					},
					{ once: true },
				);
			}

			readStream.pipe(writeStream);

			writeStream.on("close", () => {
				if (settled) return;
				settled = true;
				resolve();
			});
		});
	}
}
