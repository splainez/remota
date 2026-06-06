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
import PQueue from "p-queue";

const logger = LoggerFactory.init({ name: "main.transfer.service" });

type Downloader = (
	item: DownloadItem,
	onProgress: (transferredBytes: number) => void,
	signal: AbortSignal,
) => Promise<void>;

interface TransferJob {
	id: string;
	connectionId: number;
	items: DownloadItem[];
	cancelled: boolean;
	results: Record<string, DownloadItemResult>;
	abortControllers: AbortController[];
	itemControllers: Map<string, AbortController>;
}

export interface TransferServiceOptions {
	sftp: SftpConnectionManager;
	s3: S3ConnectionManager;
	store: AppStore;
}

export class TransferService {
	private readonly sftp: SftpConnectionManager;
	private readonly s3: S3ConnectionManager;
	private readonly queue: PQueue;
	private readonly jobs = new Map<string, TransferJob>();

	constructor(opts: TransferServiceOptions) {
		this.sftp = opts.sftp;
		this.s3 = opts.s3;
		this.queue = new PQueue({ concurrency: this.clampConcurrency(opts.store.getSettings().maxParallelTransfers) });
	}

	startDownload(req: DownloadRequest, webContents: WebContents): DownloadResult {
		const job: TransferJob = {
			id: randomUUID(),
			connectionId: req.connectionId,
			items: req.items,
			cancelled: false,
			results: {},
			abortControllers: [],
			itemControllers: new Map(),
		};
		this.jobs.set(job.id, job);

		let downloader: Downloader;
		try {
			downloader = this.resolveDownloader(job.connectionId);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			for (const item of job.items) {
				job.results[item.id] = { id: item.id, status: "error", error: message };
			}
			this.jobs.delete(job.id);
			webContents.send(IPC.TRANSFER_JOB_DONE, { jobId: job.id, results: job.results });
			return { jobId: job.id };
		}

		const promises = job.items.map((item) => {
			const controller = new AbortController();
			job.abortControllers.push(controller);
			job.itemControllers.set(item.id, controller);

			return this.queue
				.add(() => this.downloadItem(job, item, downloader, webContents, controller.signal), {
					signal: controller.signal,
				})
				.catch(() => {
					if (!Object.hasOwn(job.results, item.id)) {
						job.results[item.id] = { id: item.id, status: "cancelled" };
						this.emit(webContents, job, item, "cancelled", 0);
					}
				});
		});

		Promise.all(promises)
			.then(() => {
				this.jobs.delete(job.id);
				webContents.send(IPC.TRANSFER_JOB_DONE, { jobId: job.id, results: job.results });
			})
			.catch((err: unknown) => {
				logger.error("runJob crashed", { jobId: job.id, error: err });
				this.jobs.delete(job.id);
			});

		return { jobId: job.id };
	}

	cancel(jobId: string): void {
		const job = this.jobs.get(jobId);
		if (!job) return;
		job.cancelled = true;
		for (const controller of job.abortControllers) {
			controller.abort();
		}
	}

	cancelItem(jobId: string, itemId: string): void {
		const job = this.jobs.get(jobId);
		if (!job) return;
		const controller = job.itemControllers.get(itemId);
		if (controller) {
			controller.abort();
		}
	}

	cancelAll(): void {
		for (const job of this.jobs.values()) {
			job.cancelled = true;
			for (const controller of job.abortControllers) {
				controller.abort();
			}
		}
	}

	setConcurrency(value: number): void {
		this.queue.concurrency = this.clampConcurrency(value);
	}

	private clampConcurrency(value: number): number {
		if (!Number.isFinite(value) || value < 1) return 1;
		if (value > 20) return 20;
		return Math.floor(value);
	}

	private resolveDownloader(connectionId: number): Downloader {
		if (this.sftp.isConnected(connectionId)) {
			return (item, onProgress, signal) =>
				this.sftp.downloadFile(connectionId, item.remotePath, item.localPath, onProgress, signal);
		}
		if (this.s3.isConnected(connectionId)) {
			return (item, onProgress, signal) =>
				this.s3.downloadFile(connectionId, item.remotePath, item.localPath, onProgress, signal);
		}
		throw new Error("Not connected to remote server");
	}

	private createCompositeSignal(job: TransferJob, taskSignal: AbortSignal): AbortSignal {
		const controller = new AbortController();

		if (taskSignal.aborted || job.cancelled) {
			controller.abort();
			return controller.signal;
		}

		const onAbort = (): void => {
			controller.abort();
		};
		taskSignal.addEventListener("abort", onAbort, { once: true });

		return controller.signal;
	}

	private async downloadItem(
		job: TransferJob,
		item: DownloadItem,
		downloader: Downloader,
		webContents: WebContents,
		taskSignal: AbortSignal,
	): Promise<void> {
		const signal = this.createCompositeSignal(job, taskSignal);

		if (signal.aborted) {
			job.results[item.id] = { id: item.id, status: "cancelled" };
			this.emit(webContents, job, item, "cancelled", 0);
			return;
		}

		this.emit(webContents, job, item, "active", 0);

		try {
			await downloader(
				item,
				(transferredBytes) => {
					this.emit(webContents, job, item, "active", transferredBytes);
				},
				signal,
			);

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- signal.aborted changes during async execution
			if (signal.aborted) {
				job.results[item.id] = { id: item.id, status: "cancelled" };
				this.emit(webContents, job, item, "cancelled", 0);
				return;
			}

			job.results[item.id] = { id: item.id, status: "ok" };
			this.emit(webContents, job, item, "completed", item.size);
		} catch (err: unknown) {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- signal.aborted changes during async execution
			if (signal.aborted) {
				job.results[item.id] = { id: item.id, status: "cancelled" };
				this.emit(webContents, job, item, "cancelled", 0);
				return;
			}
			const message = err instanceof Error ? err.message : String(err);
			job.results[item.id] = { id: item.id, status: "error", error: message };
			this.emit(webContents, job, item, "failed", 0, message);
		}
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
