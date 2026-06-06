import { randomUUID } from "node:crypto";

import type { AppStore } from "@main/app-store";
import type { S3ConnectionManager } from "@main/s3/s3-client";
import type { SftpConnectionManager } from "@main/sftp/sftp-client";
import { IPC } from "@shared/ipc-channels";
import { LoggerFactory } from "@shared/lib/logger";
import type {
	DownloadItem,
	DownloadItemResult,
	DownloadRequest,
	DownloadResult,
	TransferProgressEvent,
} from "@shared/transfer-types";
import type { WebContents } from "electron";

const logger = LoggerFactory.init({ name: "main.transfer.service" });

type Downloader = (item: DownloadItem, onProgress: (transferredBytes: number) => void) => Promise<void>;

interface TransferJob {
	id: string;
	connectionId: number;
	items: DownloadItem[];
	concurrency: number;
	cancelled: boolean;
	active: Set<string>;
}

export interface TransferServiceOptions {
	sftp: SftpConnectionManager;
	s3: S3ConnectionManager;
	store: AppStore;
}

export class TransferService {
	private readonly sftp: SftpConnectionManager;
	private readonly s3: S3ConnectionManager;
	private readonly store: AppStore;
	private readonly jobs = new Map<string, TransferJob>();
	private readonly completers = new Map<string, () => void>();

	constructor(opts: TransferServiceOptions) {
		this.sftp = opts.sftp;
		this.s3 = opts.s3;
		this.store = opts.store;
	}

	startDownload(req: DownloadRequest, webContents: WebContents): DownloadResult {
		const concurrency = this.clampConcurrency(this.store.getSettings().maxParallelTransfers);
		const job: TransferJob = {
			id: randomUUID(),
			connectionId: req.connectionId,
			items: req.items,
			concurrency,
			cancelled: false,
			active: new Set(),
		};
		this.jobs.set(job.id, job);

		new Promise<void>((resolve) => {
			this.completers.set(job.id, resolve);
		}).catch(() => undefined);

		this.runJob(job, webContents).catch((err: unknown) => {
			logger.error("runJob crashed", { jobId: job.id, error: err });
			const resolve = this.completers.get(job.id);
			this.completers.delete(job.id);
			this.jobs.delete(job.id);
			resolve?.();
		});

		return { jobId: job.id };
	}

	cancel(jobId: string): void {
		const job = this.jobs.get(jobId);
		if (!job) return;
		job.cancelled = true;
	}

	cancelAll(): void {
		for (const job of this.jobs.values()) {
			job.cancelled = true;
		}
	}

	private clampConcurrency(value: number): number {
		if (!Number.isFinite(value) || value < 1) return 1;
		if (value > 20) return 20;
		return Math.floor(value);
	}

	private resolveDownloader(connectionId: number): Downloader {
		if (this.sftp.isConnected(connectionId)) {
			return (i, onProgress) => this.sftp.downloadFile(connectionId, i.remotePath, i.localPath, onProgress);
		}
		if (this.s3.isConnected(connectionId)) {
			return (i, onProgress) => this.s3.downloadFile(connectionId, i.remotePath, i.localPath, onProgress);
		}
		throw new Error("Not connected to remote server");
	}

	private async runJob(job: TransferJob, webContents: WebContents): Promise<void> {
		const results: Record<string, DownloadItemResult> = {};

		let downloader: Downloader;
		try {
			downloader = this.resolveDownloader(job.connectionId);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			for (const item of job.items) {
				results[item.id] = { id: item.id, status: "error", error: message };
			}
			this.jobs.delete(job.id);
			const resolve = this.completers.get(job.id);
			this.completers.delete(job.id);
			webContents.send(IPC.TRANSFER_JOB_DONE, { jobId: job.id, results });
			resolve?.();
			return;
		}

		const queue: DownloadItem[] = [...job.items];
		const allDone: Promise<void>[] = [];

		const pump = (): void => {
			while (!job.cancelled && queue.length > 0 && job.active.size < job.concurrency) {
				const item = queue.shift();
				if (!item) break;
				job.active.add(item.id);
				this.emit(webContents, job, item, "active", 0);

				const promise = downloader(item, (transferredBytes) => {
					this.emit(webContents, job, item, "active", transferredBytes);
				})
					.then(() => {
						results[item.id] = { id: item.id, status: "ok" };
						this.emit(webContents, job, item, "completed", item.size);
					})
					.catch((err: unknown) => {
						const message = err instanceof Error ? err.message : String(err);
						results[item.id] = { id: item.id, status: "error", error: message };
						this.emit(webContents, job, item, "failed", 0, message);
					})
					.finally(() => {
						job.active.delete(item.id);
						pump();
					});
				allDone.push(promise);
			}
		};

		pump();
		await Promise.all(allDone);

		if (job.cancelled) {
			for (const item of job.items) {
				if (Object.hasOwn(results, item.id)) continue;
				results[item.id] = { id: item.id, status: "cancelled" };
			}
		}

		this.jobs.delete(job.id);
		const resolve = this.completers.get(job.id);
		this.completers.delete(job.id);
		webContents.send(IPC.TRANSFER_JOB_DONE, { jobId: job.id, results });
		resolve?.();
	}

	private emit(
		webContents: WebContents,
		job: TransferJob,
		item: DownloadItem,
		status: TransferProgressEvent["status"],
		transferredBytes: number,
		error?: string,
	): void {
		const event: TransferProgressEvent = {
			jobId: job.id,
			id: item.id,
			connectionId: job.connectionId,
			name: item.remotePath.split("/").pop() ?? item.remotePath,
			source: item.remotePath,
			target: item.localPath,
			direction: "download",
			totalBytes: item.size,
			transferredBytes,
			status,
			...(error !== undefined ? { error } : {}),
		};
		webContents.send(IPC.TRANSFER_PROGRESS, event);
	}
}
