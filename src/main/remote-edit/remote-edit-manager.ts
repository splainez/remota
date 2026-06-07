import { randomUUID } from "node:crypto";
import { watch, statSync, unlink, type FSWatcher } from "node:fs";
import { resolve, sep } from "node:path";

import type { S3ConnectionManager } from "@main/s3/s3-client";
import type { SftpConnectionManager } from "@main/sftp/sftp-client";
import type { TempManager } from "@main/temp/temp-manager";
import { IPC } from "@shared/ipc-channels";
import { LoggerFactory } from "@shared/lib/logger";
import type { TransferProgressEvent } from "@shared/transfer-types";
import { shell, type WebContents } from "electron";

const logger = LoggerFactory.init({ name: "main.remoteEdit" });

const UPLOAD_DEBOUNCE_MS = 1000;

interface EditSession {
	connectionId: number;
	remotePath: string;
	tempPath: string;
	watcher: FSWatcher | null;
	debounceTimer: ReturnType<typeof setTimeout> | null;
	currentUploadController: AbortController | null;
	uploading: boolean;
	uploadJobId: string | null;
	uploadItemId: string | null;
}

export interface RemoteEditManagerOptions {
	sftp: SftpConnectionManager;
	s3: S3ConnectionManager;
	tempManager: TempManager;
	getWebContents: () => WebContents | null;
}

export class RemoteEditManager {
	private readonly sftp: SftpConnectionManager;
	private readonly s3: S3ConnectionManager;
	private readonly tempManager: TempManager;
	private readonly getWebContents: () => WebContents | null;
	private readonly sessions = new Map<string, EditSession>();
	private readonly uploadControllers = new Map<string, AbortController>();
	private readonly downloadControllers = new Map<string, AbortController>();

	constructor(opts: RemoteEditManagerOptions) {
		this.sftp = opts.sftp;
		this.s3 = opts.s3;
		this.tempManager = opts.tempManager;
		this.getWebContents = opts.getWebContents;
	}

	async startEdit(connectionId: number, remotePath: string): Promise<{ tempPath: string }> {
		const key = this.sessionKey(connectionId, remotePath);

		const existing = this.sessions.get(key);
		if (existing) {
			this.stopEdit(connectionId, remotePath);
		}

		const tempPath = this.resolveTempPath(connectionId, remotePath);

		const downloader = this.resolveDownloadFn(connectionId);

		const stat = await this.getRemoteStat(connectionId, remotePath);
		const size = stat?.size ?? 0;

		const jobId = randomUUID();
		const itemId = randomUUID();

		const downloadController = new AbortController();
		this.downloadControllers.set(itemId, downloadController);

		try {
			this.emitProgress(jobId, itemId, connectionId, remotePath, tempPath, "download", "queued", 0, size);
			this.emitProgress(jobId, itemId, connectionId, remotePath, tempPath, "download", "active", 0, size);

			await downloader(
				connectionId,
				remotePath,
				tempPath,
				(transferredBytes) => {
					this.emitProgress(
						jobId,
						itemId,
						connectionId,
						remotePath,
						tempPath,
						"download",
						"active",
						transferredBytes,
						size,
					);
				},
				downloadController.signal,
			);

			this.emitProgress(jobId, itemId, connectionId, remotePath, tempPath, "download", "completed", size, size);

			shell.openPath(tempPath).catch((err: unknown) => {
				logger.error("failed to open file with OS editor", { tempPath, error: String(err) });
			});
		} catch (err: unknown) {
			if (downloadController.signal.aborted) {
				this.emitProgress(jobId, itemId, connectionId, remotePath, tempPath, "download", "cancelled", 0, 0);
				unlink(tempPath, () => {
					/* noop — best-effort cleanup */
				});
				return { tempPath };
			}
			throw err;
		} finally {
			this.downloadControllers.delete(itemId);
		}

		try {
			const watcher = watch(tempPath, () => {
				this.onFileChange(key);
			});

			watcher.on("error", (err) => {
				logger.error("watcher error", { key, error: err.message });
				this.stopEdit(connectionId, remotePath);
			});

			const session: EditSession = {
				connectionId,
				remotePath,
				tempPath,
				watcher,
				debounceTimer: null,
				currentUploadController: null,
				uploading: false,
				uploadJobId: null,
				uploadItemId: null,
			};

			this.sessions.set(key, session);
		} catch (err: unknown) {
			unlink(tempPath, () => {
				/* noop — best-effort cleanup */
			});
			throw err;
		}

		return { tempPath };
	}

	stopEdit(connectionId: number, remotePath: string): void {
		const key = this.sessionKey(connectionId, remotePath);
		const session = this.sessions.get(key);
		if (!session) return;

		if (session.watcher) {
			session.watcher.close();
			session.watcher = null;
		}

		if (session.debounceTimer) {
			clearTimeout(session.debounceTimer);
			session.debounceTimer = null;
		}

		if (session.currentUploadController) {
			session.currentUploadController.abort();
			session.currentUploadController = null;
		}

		session.uploading = false;

		this.sessions.delete(key);
	}

	stopAllForConnection(connectionId: number): void {
		const keys: string[] = [];
		for (const [key, session] of this.sessions) {
			if (session.connectionId === connectionId) {
				keys.push(key);
			}
		}
		for (const key of keys) {
			const session = this.sessions.get(key);
			if (session) {
				this.stopEdit(session.connectionId, session.remotePath);
			}
		}
	}

	stopAll(): void {
		const entries = [...this.sessions.values()];
		for (const session of entries) {
			this.stopEdit(session.connectionId, session.remotePath);
		}
	}

	cancelUpload(itemId: string): boolean {
		const controller = this.uploadControllers.get(itemId);
		if (!controller) return false;
		controller.abort();
		return true;
	}

	cancelAllUploads(): void {
		for (const controller of this.uploadControllers.values()) {
			controller.abort();
		}
	}

	cancelDownload(itemId: string): boolean {
		const controller = this.downloadControllers.get(itemId);
		if (!controller) return false;
		controller.abort();
		return true;
	}

	cancelAllDownloads(): void {
		for (const controller of this.downloadControllers.values()) {
			controller.abort();
		}
	}

	private onFileChange(key: string): void {
		const session = this.sessions.get(key);
		if (!session) return;

		if (session.debounceTimer) {
			clearTimeout(session.debounceTimer);
		}

		session.debounceTimer = setTimeout(() => {
			session.debounceTimer = null;
			void this.uploadFile(session);
		}, UPLOAD_DEBOUNCE_MS);
	}

	private async uploadFile(session: EditSession): Promise<void> {
		if (session.currentUploadController) {
			session.currentUploadController.abort();
			session.currentUploadController = null;
		}

		const controller = new AbortController();
		session.currentUploadController = controller;
		session.uploading = true;

		if (!session.uploadJobId || !session.uploadItemId) {
			session.uploadJobId = randomUUID();
			session.uploadItemId = randomUUID();
		}
		const jobId = session.uploadJobId;
		const itemId = session.uploadItemId;

		this.uploadControllers.set(itemId, controller);

		try {
			let size = 0;
			try {
				const stats = statSync(session.tempPath);
				size = stats.size;
			} catch {
				// File may have been deleted
			}

			this.emitProgress(
				jobId,
				itemId,
				session.connectionId,
				session.remotePath,
				session.tempPath,
				"upload",
				"active",
				0,
				size,
			);

			const uploader = this.resolveUploadFn(session.connectionId);
			await uploader(
				session.connectionId,
				session.tempPath,
				session.remotePath,
				(transferredBytes) => {
					if (session.currentUploadController === controller) {
						this.emitProgress(
							jobId,
							itemId,
							session.connectionId,
							session.remotePath,
							session.tempPath,
							"upload",
							"active",
							transferredBytes,
							size,
						);
					}
				},
				controller.signal,
			);

			if (session.currentUploadController !== controller) {
				this.emitProgress(
					jobId,
					itemId,
					session.connectionId,
					session.remotePath,
					session.tempPath,
					"upload",
					"cancelled",
					0,
					0,
				);
				return;
			}

			this.emitProgress(
				jobId,
				itemId,
				session.connectionId,
				session.remotePath,
				session.tempPath,
				"upload",
				"completed",
				size,
				size,
			);

			this.emitJobDone(jobId, itemId);
		} catch (err: unknown) {
			if (controller.signal.aborted || session.currentUploadController !== controller) {
				this.emitProgress(
					jobId,
					itemId,
					session.connectionId,
					session.remotePath,
					session.tempPath,
					"upload",
					"cancelled",
					0,
					0,
				);
				return;
			}
			const message = err instanceof Error ? err.message : String(err);
			logger.error("upload failed", { key: this.sessionKey(session.connectionId, session.remotePath), error: message });
			this.emitProgress(
				jobId,
				itemId,
				session.connectionId,
				session.remotePath,
				session.tempPath,
				"upload",
				"failed",
				0,
				0,
				message,
			);
		} finally {
			this.uploadControllers.delete(itemId);
			if (session.currentUploadController === controller) {
				session.currentUploadController = null;
			}
			session.uploading = false;
		}
	}

	private resolveTempPath(connectionId: number, remotePath: string): string {
		const tempRoot = this.tempManager.getTempPath(connectionId);
		if (!tempRoot) {
			throw new Error(`No temp dir for connection ${String(connectionId)}`);
		}
		const relativePath = remotePath.startsWith("/") ? remotePath.slice(1) : remotePath;
		const fullPath = resolve(tempRoot, relativePath);
		const normalizedRoot = tempRoot.endsWith(sep) ? tempRoot : tempRoot + sep;
		if (!fullPath.startsWith(normalizedRoot)) {
			throw new Error("Path traversal detected");
		}
		return fullPath;
	}

	private resolveDownloadFn(
		connectionId: number,
	): (
		connId: number,
		remotePath: string,
		localPath: string,
		onProgress?: (transferredBytes: number) => void,
		signal?: AbortSignal,
	) => Promise<void> {
		if (this.sftp.isConnected(connectionId)) {
			return (connId, rp, lp, onProgress, signal) => this.sftp.downloadFile(connId, rp, lp, onProgress, signal);
		}
		if (this.s3.isConnected(connectionId)) {
			return (connId, rp, lp, onProgress, signal) => this.s3.downloadFile(connId, rp, lp, onProgress, signal);
		}
		throw new Error("Not connected to remote server");
	}

	private resolveUploadFn(
		connectionId: number,
	): (
		connId: number,
		localPath: string,
		remotePath: string,
		onProgress?: (transferredBytes: number) => void,
		signal?: AbortSignal,
	) => Promise<void> {
		if (this.sftp.isConnected(connectionId)) {
			return (connId, lp, rp, onProgress, signal) => this.sftp.uploadFile(connId, lp, rp, onProgress, signal);
		}
		if (this.s3.isConnected(connectionId)) {
			return (connId, lp, rp, onProgress, signal) => this.s3.uploadFile(connId, lp, rp, onProgress, signal);
		}
		throw new Error("Not connected to remote server");
	}

	private async getRemoteStat(connectionId: number, remotePath: string): Promise<{ size: number } | null> {
		if (this.sftp.isConnected(connectionId)) {
			return this.sftp.getRemoteStat(connectionId, remotePath);
		}
		if (this.s3.isConnected(connectionId)) {
			return this.s3.getRemoteStat(connectionId, remotePath);
		}
		return null;
	}

	private emitJobDone(jobId: string, itemId: string): void {
		const webContents = this.getWebContents();
		if (!webContents || webContents.isDestroyed()) return;

		webContents.send(IPC.TRANSFER_JOB_DONE, {
			jobId,
			results: {
				[itemId]: { id: itemId, status: "ok" as const },
			},
		});
	}

	private emitProgress(
		jobId: string,
		itemId: string,
		connectionId: number,
		remotePath: string,
		localPath: string,
		direction: "download" | "upload",
		status: TransferProgressEvent["status"],
		transferredBytes: number,
		totalBytes: number,
		error?: string,
	): void {
		const webContents = this.getWebContents();
		if (!webContents || webContents.isDestroyed()) return;

		const name = (remotePath.includes("/") ? remotePath.split("/") : remotePath.split("\\")).pop() ?? remotePath;
		const event: TransferProgressEvent = {
			jobId,
			id: itemId,
			connectionId,
			name,
			source: direction === "upload" ? localPath : remotePath,
			target: direction === "upload" ? remotePath : localPath,
			direction,
			totalBytes,
			transferredBytes,
			status,
			...(error !== undefined ? { error } : {}),
		};

		webContents.send(IPC.TRANSFER_PROGRESS, event);
	}

	private sessionKey(connectionId: number, remotePath: string): string {
		return `${String(connectionId)}:${remotePath}`;
	}
}
