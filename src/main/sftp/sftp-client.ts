import { readFileSync, mkdirSync, createWriteStream, createReadStream } from "node:fs";
import { dirname } from "node:path";

import { tempManager } from "@main/temp/temp-manager";
import { LoggerFactory } from "@shared/lib/logger";
import type { FileEntry, RemoteStat } from "@shared/types";
import { Client, type SFTPWrapper, type ConnectConfig, type ClientChannel, type InputAttributes } from "ssh2";

interface SftpSession {
	client: Client;
	sftp: SFTPWrapper;
	connectionId: number;
	uidCache: Map<number, string>;
	gidCache: Map<number, string>;
}

const logger = LoggerFactory.init({ name: "main.sftp" });

export class SftpConnectionManager {
	private sessions = new Map<number, SftpSession>();

	async connect(
		connectionId: number,
		config: {
			host: string;
			port: number;
			username: string;
			authType: "password" | "key";
			password?: string;
			privateKeyPath?: string;
		},
	): Promise<string> {
		if (this.sessions.has(connectionId)) {
			return this.homeDir(connectionId);
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
		} else {
			if (!config.privateKeyPath) {
				throw new Error("Private key path is required for key authentication");
			}
			const keyContent = readFileSync(config.privateKeyPath, "utf-8");
			sshConfig.privateKey = keyContent;
		}

		return new Promise<string>((resolve, reject) => {
			client.on("ready", () => {
				client.sftp((err, sftp) => {
					if (err) {
						client.end();
						reject(new Error(`SFTP subsystem error: ${err.message}`));
						return;
					}

					this.sessions.set(connectionId, {
						client,
						sftp,
						connectionId,
						uidCache: new Map(),
						gidCache: new Map(),
					});

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

		const list = await new Promise<{ filename: string; longname: string; attrs: Record<string, unknown> }[]>(
			(resolve, reject) => {
				session.sftp.readdir(path, (err, data) => {
					if (err) {
						reject(new Error(`Failed to list directory: ${err.message}`));
						return;
					}
					resolve(data as unknown as { filename: string; longname: string; attrs: Record<string, unknown> }[]);
				});
			},
		);

		const entries: FileEntry[] = list
			.filter((entry) => entry.filename !== "." && entry.filename !== "..")
			.map((entry) => {
				const attrs = entry.attrs;
				const isDir = typeof attrs.isDirectory === "function" ? (attrs.isDirectory as () => boolean)() : false;
				return {
					name: entry.filename,
					fullPath: `${path}/${entry.filename}`,
					isDirectory: isDir,
					size: typeof attrs.size === "number" ? attrs.size : 0,
					modified: typeof attrs.mtime === "number" ? new Date(attrs.mtime * 1000).toISOString() : "",
					mode: typeof attrs.mode === "number" ? attrs.mode : undefined,
					uid: typeof attrs.uid === "number" ? attrs.uid : undefined,
					gid: typeof attrs.gid === "number" ? attrs.gid : undefined,
				};
			});

		await this.resolveUserNames(session, entries);
		return entries;
	}

	private async resolveUserNames(session: SftpSession, entries: FileEntry[]): Promise<void> {
		const uncachedUids = new Set<number>();
		const uncachedGids = new Set<number>();

		for (const entry of entries) {
			if (entry.uid != null && !session.uidCache.has(entry.uid)) {
				uncachedUids.add(entry.uid);
			}
			if (entry.gid != null && !session.gidCache.has(entry.gid)) {
				uncachedGids.add(entry.gid);
			}
		}

		if (uncachedUids.size === 0 && uncachedGids.size === 0) {
			for (const entry of entries) {
				if (entry.uid != null) {
					entry.ownerName = session.uidCache.get(entry.uid);
				}
				if (entry.gid != null) {
					entry.groupName = session.gidCache.get(entry.gid);
				}
			}
			return;
		}

		try {
			const uids = [...uncachedUids].filter((id) => Number.isInteger(id) && id >= 0);
			const gids = [...uncachedGids].filter((id) => Number.isInteger(id) && id >= 0);

			if (uids.length > 0) {
				const uidArgs = uids.map((id) => String(id)).join(" ");
				const uidOutput = await this.execCommand(
					session,
					`for id in ${uidArgs}; do echo "$id $(getent passwd $id 2>/dev/null | cut -d: -f1 || echo $id)"; done`,
				);
				for (const line of uidOutput.split("\n")) {
					const match = /^(\d+)\s+(.+)$/.exec(line.trim());
					if (match) {
						session.uidCache.set(Number(match[1]), match[2]);
					}
				}
			}

			if (gids.length > 0) {
				const gidArgs = gids.map((id) => String(id)).join(" ");
				const gidOutput = await this.execCommand(
					session,
					`for id in ${gidArgs}; do echo "$id $(getent group $id 2>/dev/null | cut -d: -f1 || echo $id)"; done`,
				);
				for (const line of gidOutput.split("\n")) {
					const match = /^(\d+)\s+(.+)$/.exec(line.trim());
					if (match) {
						session.gidCache.set(Number(match[1]), match[2]);
					}
				}
			}
		} catch {
			// Username resolution failed — leave numeric IDs
		}

		for (const entry of entries) {
			if (entry.uid != null) {
				entry.ownerName = session.uidCache.get(entry.uid);
			}
			if (entry.gid != null) {
				entry.groupName = session.gidCache.get(entry.gid);
			}
		}
	}

	async execRemote(connectionId: number, command: string): Promise<string> {
		const session = this.sessions.get(connectionId);
		if (!session) {
			throw new Error("Not connected to remote server");
		}
		return this.execCommand(session, command);
	}

	async listUsers(connectionId: number): Promise<{ name: string; uid: number }[]> {
		const session = this.sessions.get(connectionId);
		if (!session) {
			throw new Error("Not connected to remote server");
		}
		try {
			const output = await this.execCommand(session, "getent passwd | cut -d: -f1,3");
			return output
				.split("\n")
				.filter(Boolean)
				.map((line) => {
					const [name, uidStr] = line.split(":");
					const uid = Number(uidStr);
					return name && Number.isInteger(uid) ? { name, uid } : null;
				})
				.filter((entry): entry is { name: string; uid: number } => entry != null);
		} catch {
			return [];
		}
	}

	async listGroups(connectionId: number): Promise<{ name: string; gid: number }[]> {
		const session = this.sessions.get(connectionId);
		if (!session) {
			throw new Error("Not connected to remote server");
		}
		try {
			const output = await this.execCommand(session, "getent group | cut -d: -f1,3");
			return output
				.split("\n")
				.filter(Boolean)
				.map((line) => {
					const [name, gidStr] = line.split(":");
					const gid = Number(gidStr);
					return name && Number.isInteger(gid) ? { name, gid } : null;
				})
				.filter((entry): entry is { name: string; gid: number } => entry != null);
		} catch {
			return [];
		}
	}

	private execCommand(session: SftpSession, command: string): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			session.client.exec(command, (err, stream) => {
				if (err) {
					reject(err);
					return;
				}
				let output = "";
				stream.on("data", (data: Buffer) => {
					output += data.toString();
				});
				stream.on("close", (code: number | null) => {
					if (code !== 0 && code !== null) {
						reject(new Error(`Command exited with code ${String(code)}`));
						return;
					}
					resolve(output);
				});
				stream.on("error", (streamErr: Error) => {
					reject(streamErr);
				});
			});
		});
	}

	async deletePath(connectionId: number, remotePath: string, visited?: Set<string>): Promise<void> {
		const session = this.sessions.get(connectionId);
		if (!session) {
			throw new Error("Not connected to remote server");
		}

		const resolvedPath = await new Promise<string>((resolve) => {
			session.sftp.realpath(remotePath, (err, absPath) => {
				resolve(err ? remotePath : absPath);
			});
		});

		const tracking = visited ?? new Set<string>();
		if (tracking.has(resolvedPath)) {
			throw new Error(`Symlink cycle detected at ${remotePath}`);
		}
		tracking.add(resolvedPath);

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
			await this.deletePath(connectionId, childPath, tracking);
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

	async getRemoteStat(connectionId: number, remotePath: string): Promise<RemoteStat | null> {
		const session = this.sessions.get(connectionId);
		if (!session) {
			throw new Error("Not connected to remote server");
		}

		return new Promise<RemoteStat | null>((resolve) => {
			session.sftp.stat(remotePath, (err, stats) => {
				if (err) {
					resolve(null);
					return;
				}
				resolve({
					exists: true,
					size: stats.size,
					modified: new Date(stats.mtime * 1000).toISOString(),
					isDirectory: stats.isDirectory(),
					mode: typeof stats.mode === "number" ? stats.mode : undefined,
					uid: typeof stats.uid === "number" ? stats.uid : undefined,
					gid: typeof stats.gid === "number" ? stats.gid : undefined,
				});
			});
		});
	}

	async mkdirRecursive(connectionId: number, remotePath: string): Promise<void> {
		const session = this.sessions.get(connectionId);
		if (!session) {
			throw new Error("Not connected to remote server");
		}

		const parts = remotePath.split("/").filter(Boolean);
		let current = parts[0] ? `/${parts[0]}` : "/";

		for (const part of parts.slice(1)) {
			current = `${current}/${part}`;
			await new Promise<void>((resolve) => {
				session.sftp.mkdir(current, (err: Error | null | undefined) => {
					void err;
					resolve();
				});
			});
		}
	}

	async mkdir(connectionId: number, remotePath: string): Promise<void> {
		const session = this.sessions.get(connectionId);
		if (!session) {
			throw new Error("Not connected to remote server");
		}

		return new Promise<void>((resolve, reject) => {
			session.sftp.mkdir(remotePath, (err: Error | null | undefined) => {
				if (err) {
					reject(err);
					return;
				}
				resolve();
			});
		});
	}

	async createFile(connectionId: number, remotePath: string): Promise<void> {
		const session = this.sessions.get(connectionId);
		if (!session) {
			throw new Error("Not connected to remote server");
		}

		return new Promise<void>((resolve, reject) => {
			session.sftp.open(remotePath, "w", (err: Error | null | undefined, handle: unknown) => {
				if (err) {
					reject(err);
					return;
				}
				session.sftp.close(handle as never, (closeErr: Error | null | undefined) => {
					if (closeErr) {
						reject(closeErr);
						return;
					}
					resolve();
				});
			});
		});
	}

	private async restoreRemoteAttrs(session: SftpSession, remotePath: string, attrs: InputAttributes): Promise<void> {
		const hasUid = typeof attrs.uid === "number";
		const hasGid = typeof attrs.gid === "number";
		const hasMode = typeof attrs.mode === "number";

		if (hasUid || hasGid || hasMode) {
			await new Promise<void>((resolve) => {
				session.sftp.setstat(remotePath, attrs, (err) => {
					if (err) {
						logger.warn("setstat failed, trying chmod only", { remotePath, error: err.message });
						if (hasMode) {
							session.sftp.chmod(remotePath, attrs.mode as number, (chmodErr) => {
								if (chmodErr) {
									logger.warn("chmod also failed, permissions not restored", { remotePath, error: chmodErr.message });
								}
								resolve();
							});
						} else {
							resolve();
						}
					} else {
						resolve();
					}
				});
			});
		}
	}

	async uploadFile(
		connectionId: number,
		localPath: string,
		remotePath: string,
		onProgress?: (transferredBytes: number) => void,
		signal?: AbortSignal,
		attrs?: InputAttributes,
	): Promise<void> {
		const session = this.sessions.get(connectionId);
		if (!session) {
			throw new Error("Not connected to remote server");
		}

		const dir = dirname(remotePath);
		await this.mkdirRecursive(connectionId, dir);

		return new Promise<void>((resolve, reject) => {
			const readStream = createReadStream(localPath, { highWaterMark: 64 * 1024 });
			const writeStream = session.sftp.createWriteStream(remotePath);
			let settled = false;
			let transferred = 0;

			const fail = (err: Error): void => {
				if (settled) return;
				settled = true;
				readStream.destroy();
				writeStream.destroy();
				reject(err);
			};

			writeStream.on("error", (err: Error) => {
				fail(new Error(`Failed to write remote file: ${err.message}`));
			});

			readStream.on("error", (err: Error) => {
				fail(new Error(`Failed to read local file: ${err.message}`));
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
				if (attrs) {
					this.restoreRemoteAttrs(session, remotePath, attrs)
						.then(() => {
							resolve();
						})
						.catch(() => {
							resolve();
						});
				} else {
					resolve();
				}
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
