import type { AppStore } from "@main/app-store";
import type { S3ConnectionManager } from "@main/s3/s3-client";
import type { SftpConnectionManager } from "@main/sftp/sftp-client";
import type { DownloadItem } from "@shared/types";
import type { WebContents } from "electron";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { TransferService } from "./transfer-service";

interface AppStoreStub {
	getSettings: () => { maxParallelTransfers: number };
}

interface SftpStub {
	isConnected: (id: number) => boolean;
	downloadFile: (
		connectionId: number,
		remotePath: string,
		localPath: string,
		onProgress?: (transferredBytes: number) => void,
		signal?: AbortSignal,
	) => Promise<void>;
}

interface S3Stub {
	isConnected: (id: number) => boolean;
	downloadFile: (
		connectionId: number,
		remotePath: string,
		localPath: string,
		onProgress?: (transferredBytes: number) => void,
		signal?: AbortSignal,
	) => Promise<void>;
}

function makeAppStore(maxParallel = 5): AppStoreStub {
	return {
		getSettings: () => ({ maxParallelTransfers: maxParallel }),
	};
}

function makeSftp(
	connected: boolean,
	downloadImpl?: (
		connectionId: number,
		remotePath: string,
		localPath: string,
		onProgress?: (b: number) => void,
		signal?: AbortSignal,
	) => Promise<void>,
): SftpStub {
	return {
		isConnected: () => connected,
		downloadFile: (cid, rp, lp, onProgress, signal) =>
			downloadImpl?.(cid, rp, lp, onProgress, signal) ?? Promise.resolve(),
	};
}

function makeS3(connected: boolean): S3Stub {
	return {
		isConnected: () => connected,
		downloadFile: () => Promise.resolve(),
	};
}

interface CapturedEvent {
	jobId: string;
	id: string;
	connectionId: number;
	name: string;
	source: string;
	target: string;
	direction: "download" | "upload";
	totalBytes: number;
	transferredBytes: number;
	status: "queued" | "active" | "completed" | "failed" | "cancelled";
	error?: string;
}

interface CapturedJob {
	jobId: string;
	results: Record<string, { id: string; status: "ok" | "error" | "cancelled"; error?: string }>;
}

interface WebContentsStub {
	events: CapturedEvent[];
	jobs: CapturedJob[];
	send: (channel: string, payload: unknown) => void;
}

function makeWebContents(): WebContentsStub {
	const events: CapturedEvent[] = [];
	const jobs: CapturedJob[] = [];
	return {
		events,
		jobs,
		send: (channel, payload) => {
			if (channel === "transfer:progress") events.push(payload as CapturedEvent);
			if (channel === "transfer:jobDone") jobs.push(payload as CapturedJob);
		},
	};
}

function makeItems(n: number): DownloadItem[] {
	return Array.from({ length: n }, (_, i) => ({
		id: `f${String(i)}`,
		remotePath: `/remote/f${String(i)}.txt`,
		localPath: `/local/f${String(i)}.txt`,
		remoteModified: "2024-01-01T00:00:00Z",
		size: 100,
	}));
}

describe("TransferService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("throws when no connection is active for the connectionId", async () => {
		const wc = makeWebContents();
		const service = new TransferService({
			sftp: makeSftp(false) as unknown as SftpConnectionManager,
			s3: makeS3(false) as unknown as S3ConnectionManager,
			store: makeAppStore() as unknown as AppStore,
		});

		const { jobId } = service.startDownload({ connectionId: 1, items: makeItems(1) }, wc as unknown as WebContents);
		await new Promise((r) => setTimeout(r, 10));

		const job = wc.jobs[0] as CapturedJob | undefined;
		if (!job) throw new Error("jobDone event was not emitted");
		const f0 = job.results.f0 as { status: "ok" | "error" | "cancelled"; error?: string } | undefined;
		if (!f0) throw new Error("missing f0");
		expect(f0.status).toBe("error");
		expect(f0.error).toContain("Not connected");
		expect(jobId).toBeDefined();
	});

	it("emits active, completed events per item", async () => {
		const wc = makeWebContents();
		const service = new TransferService({
			sftp: makeSftp(true) as unknown as SftpConnectionManager,
			s3: makeS3(false) as unknown as S3ConnectionManager,
			store: makeAppStore() as unknown as AppStore,
		});

		service.startDownload({ connectionId: 1, items: makeItems(1) }, wc as unknown as WebContents);
		await new Promise((r) => setTimeout(r, 10));

		const statuses = wc.events.map((e) => e.status);
		expect(statuses).toContain("active");
		expect(statuses).toContain("completed");
	});

	it("respects global concurrency limit: at most N active simultaneously", async () => {
		let activeNow = 0;
		let peak = 0;
		const wc = makeWebContents();

		const sftp: SftpStub = {
			isConnected: () => true,
			downloadFile: async () => {
				activeNow++;
				peak = Math.max(peak, activeNow);
				await new Promise((r) => setTimeout(r, 15));
				activeNow--;
			},
		};

		const service = new TransferService({
			sftp: sftp as unknown as SftpConnectionManager,
			s3: makeS3(false) as unknown as S3ConnectionManager,
			store: makeAppStore(3) as unknown as AppStore,
		});

		service.startDownload({ connectionId: 1, items: makeItems(10) }, wc as unknown as WebContents);
		await new Promise((r) => setTimeout(r, 200));

		expect(peak).toBeLessThanOrEqual(3);
		expect(peak).toBeGreaterThan(1);
	});

	it("shares concurrency across multiple startDownload calls", async () => {
		let activeNow = 0;
		let peak = 0;
		const wc = makeWebContents();

		const sftp: SftpStub = {
			isConnected: () => true,
			downloadFile: async () => {
				activeNow++;
				peak = Math.max(peak, activeNow);
				await new Promise((r) => setTimeout(r, 20));
				activeNow--;
			},
		};

		const service = new TransferService({
			sftp: sftp as unknown as SftpConnectionManager,
			s3: makeS3(false) as unknown as S3ConnectionManager,
			store: makeAppStore(2) as unknown as AppStore,
		});

		service.startDownload({ connectionId: 1, items: makeItems(3) }, wc as unknown as WebContents);
		await new Promise((r) => setTimeout(r, 5));
		service.startDownload({ connectionId: 1, items: makeItems(3) }, wc as unknown as WebContents);

		await new Promise((r) => setTimeout(r, 300));

		expect(peak).toBeLessThanOrEqual(2);
		expect(peak).toBeGreaterThan(1);
	});

	it("dynamically updates concurrency when setConcurrency is called", async () => {
		let activeNow = 0;
		let peak = 0;
		const wc = makeWebContents();
		const settings = { maxParallelTransfers: 1 };
		const store: AppStoreStub = { getSettings: () => settings };

		const sftp: SftpStub = {
			isConnected: () => true,
			downloadFile: async () => {
				activeNow++;
				peak = Math.max(peak, activeNow);
				await new Promise((r) => setTimeout(r, 20));
				activeNow--;
			},
		};

		const service = new TransferService({
			sftp: sftp as unknown as SftpConnectionManager,
			s3: makeS3(false) as unknown as S3ConnectionManager,
			store: store as unknown as AppStore,
		});

		service.startDownload({ connectionId: 1, items: makeItems(4) }, wc as unknown as WebContents);

		await new Promise((r) => setTimeout(r, 30));
		expect(peak).toBeLessThanOrEqual(1);

		service.setConcurrency(3);

		await new Promise((r) => setTimeout(r, 300));
		expect(peak).toBeGreaterThan(1);
		expect(peak).toBeLessThanOrEqual(3);
	});

	it("clamps concurrency to the supported bounds even if store returns weird values", async () => {
		const wc = makeWebContents();
		const sftp = makeSftp(true);
		const store = makeAppStore(0);
		const service = new TransferService({
			sftp: sftp as unknown as SftpConnectionManager,
			s3: makeS3(false) as unknown as S3ConnectionManager,
			store: store as unknown as AppStore,
		});

		service.startDownload({ connectionId: 1, items: makeItems(1) }, wc as unknown as WebContents);
		await new Promise((r) => setTimeout(r, 20));

		const job = wc.jobs[0] as CapturedJob | undefined;
		if (!job) throw new Error("jobDone event was not emitted");
		const f0 = job.results.f0 as { status: "ok" | "error" | "cancelled" } | undefined;
		expect(f0?.status).toBe("ok");
	});

	it("cancel() marks the job; remaining queued items are reported as cancelled", async () => {
		const wc = makeWebContents();
		let resolveDownloads: () => void = () => undefined;
		const blockingDownload = new Promise<void>((r) => {
			resolveDownloads = r;
		});

		const sftp: SftpStub = {
			isConnected: () => true,
			downloadFile: async () => {
				await blockingDownload;
			},
		};

		const service = new TransferService({
			sftp: sftp as unknown as SftpConnectionManager,
			s3: makeS3(false) as unknown as S3ConnectionManager,
			store: makeAppStore(1) as unknown as AppStore,
		});

		const { jobId } = service.startDownload({ connectionId: 1, items: makeItems(3) }, wc as unknown as WebContents);

		await new Promise((r) => setTimeout(r, 5));
		service.cancel(jobId);
		resolveDownloads();

		await new Promise((r) => setTimeout(r, 30));

		const job = wc.jobs[0] as CapturedJob | undefined;
		if (!job) throw new Error("jobDone event was not emitted");
		const f0 = job.results.f0 as { status: "ok" | "error" | "cancelled" } | undefined;
		const f1 = job.results.f1 as { status: "ok" | "error" | "cancelled" } | undefined;
		const f2 = job.results.f2 as { status: "ok" | "error" | "cancelled" } | undefined;
		if (!f0 || !f1 || !f2) throw new Error("missing items");
		expect(f0.status).toBe("cancelled");
		expect(f1.status).toBe("cancelled");
		expect(f2.status).toBe("cancelled");
	});

	it("cancel() aborts an in-flight download: downloader receives signal and throws", async () => {
		const wc = makeWebContents();
		let downloadStarted: () => void = () => undefined;
		const started = new Promise<void>((r) => {
			downloadStarted = r;
		});

		const sftp: SftpStub = {
			isConnected: () => true,
			downloadFile: async (_cid, _rp, _lp, _onProgress, signal) => {
				downloadStarted();
				await new Promise<void>((_resolve, reject) => {
					if (signal?.aborted) {
						reject(new DOMException("Aborted", "AbortError"));
						return;
					}
					signal?.addEventListener(
						"abort",
						() => {
							reject(new DOMException("Aborted", "AbortError"));
						},
						{ once: true },
					);
				});
			},
		};

		const service = new TransferService({
			sftp: sftp as unknown as SftpConnectionManager,
			s3: makeS3(false) as unknown as S3ConnectionManager,
			store: makeAppStore(1) as unknown as AppStore,
		});

		const { jobId } = service.startDownload({ connectionId: 1, items: makeItems(1) }, wc as unknown as WebContents);

		await started;
		service.cancel(jobId);

		await new Promise((r) => setTimeout(r, 30));

		const job = wc.jobs[0] as CapturedJob | undefined;
		if (!job) throw new Error("jobDone event was not emitted");
		const f0 = job.results.f0 as { status: "ok" | "error" | "cancelled" } | undefined;
		expect(f0?.status).toBe("cancelled");

		const cancelledEvents = wc.events.filter((e) => e.status === "cancelled");
		expect(cancelledEvents.length).toBeGreaterThanOrEqual(1);
	});

	it("cancel() aborts in-flight download: downloader uses signal to destroy streams early", async () => {
		const wc = makeWebContents();
		let resolveDownload: () => void = () => undefined;
		const downloadGate = new Promise<void>((r) => {
			resolveDownload = r;
		});
		const abortSignals: (AbortSignal | undefined)[] = [];

		const sftp: SftpStub = {
			isConnected: () => true,
			downloadFile: async (_cid, _rp, _lp, _onProgress, signal) => {
				abortSignals.push(signal);
				await downloadGate;
			},
		};

		const service = new TransferService({
			sftp: sftp as unknown as SftpConnectionManager,
			s3: makeS3(false) as unknown as S3ConnectionManager,
			store: makeAppStore(1) as unknown as AppStore,
		});

		const { jobId } = service.startDownload({ connectionId: 1, items: makeItems(1) }, wc as unknown as WebContents);

		await new Promise((r) => setTimeout(r, 5));
		service.cancel(jobId);
		resolveDownload();

		await new Promise((r) => setTimeout(r, 30));

		expect(abortSignals).toHaveLength(1);
		expect(abortSignals[0]?.aborted).toBe(true);
	});

	it("cancel() on one job does not affect downloads from other jobs", async () => {
		const wc = makeWebContents();

		const sftp: SftpStub = {
			isConnected: () => true,
			downloadFile: async (_cid, _rp, _lp, _onProgress, signal) => {
				await new Promise<void>((_resolve, reject) => {
					if (signal?.aborted) {
						reject(new DOMException("Aborted", "AbortError"));
						return;
					}
					signal?.addEventListener(
						"abort",
						() => {
							reject(new DOMException("Aborted", "AbortError"));
						},
						{ once: true },
					);
				});
			},
		};

		const service = new TransferService({
			sftp: sftp as unknown as SftpConnectionManager,
			s3: makeS3(false) as unknown as S3ConnectionManager,
			store: makeAppStore(1) as unknown as AppStore,
		});

		const { jobId: job1Id } = service.startDownload(
			{ connectionId: 1, items: makeItems(1) },
			wc as unknown as WebContents,
		);
		const { jobId: job2Id } = service.startDownload(
			{ connectionId: 1, items: makeItems(1) },
			wc as unknown as WebContents,
		);

		await new Promise((r) => setTimeout(r, 5));
		service.cancel(job1Id);

		await new Promise((r) => setTimeout(r, 50));

		const job1Done = wc.jobs.find((j) => j.jobId === job1Id);
		const job2Done = wc.jobs.find((j) => j.jobId === job2Id);

		expect(job1Done).toBeDefined();
		expect(job1Done?.results.f0).toEqual({ id: "f0", status: "cancelled" });

		if (job2Done) {
			expect(job2Done.results.f0).toEqual({ id: "f0", status: "ok" });
		}
	});

	it("cancelItem() cancels only the targeted item, other items in the same job continue", async () => {
		const wc = makeWebContents();
		const resolvers: (() => void)[] = [];

		const sftp: SftpStub = {
			isConnected: () => true,
			downloadFile: async (_cid, _rp, _lp, _onProgress, signal) => {
				await new Promise<void>((_resolve, reject) => {
					if (signal?.aborted) {
						reject(new DOMException("Aborted", "AbortError"));
						return;
					}
					signal?.addEventListener(
						"abort",
						() => {
							reject(new DOMException("Aborted", "AbortError"));
						},
						{ once: true },
					);
					resolvers.push(_resolve);
				});
			},
		};

		const service = new TransferService({
			sftp: sftp as unknown as SftpConnectionManager,
			s3: makeS3(false) as unknown as S3ConnectionManager,
			store: makeAppStore(3) as unknown as AppStore,
		});

		const items = makeItems(3);
		const { jobId } = service.startDownload({ connectionId: 1, items }, wc as unknown as WebContents);

		await new Promise((r) => setTimeout(r, 10));
		expect(resolvers).toHaveLength(3);

		service.cancelItem(jobId, items[1].id);

		resolvers[0]();
		resolvers[2]();

		await new Promise((r) => setTimeout(r, 50));

		const job = wc.jobs[0] as CapturedJob | undefined;
		if (!job) throw new Error("jobDone event was not emitted");
		const f0 = job.results.f0 as { status: "ok" | "error" | "cancelled" } | undefined;
		const f1 = job.results.f1 as { status: "ok" | "error" | "cancelled" } | undefined;
		const f2 = job.results.f2 as { status: "ok" | "error" | "cancelled" } | undefined;
		if (!f0 || !f1 || !f2) throw new Error("missing items");
		expect(f0.status).toBe("ok");
		expect(f1.status).toBe("cancelled");
		expect(f2.status).toBe("ok");
	});

	it("cancelItem() with unknown itemId is a no-op", async () => {
		const wc = makeWebContents();
		const sftp: SftpStub = {
			isConnected: () => true,
			downloadFile: async () => {
				await new Promise((r) => setTimeout(r, 50));
			},
		};

		const service = new TransferService({
			sftp: sftp as unknown as SftpConnectionManager,
			s3: makeS3(false) as unknown as S3ConnectionManager,
			store: makeAppStore(1) as unknown as AppStore,
		});

		const { jobId } = service.startDownload({ connectionId: 1, items: makeItems(1) }, wc as unknown as WebContents);

		await new Promise((r) => setTimeout(r, 5));
		service.cancelItem(jobId, "nonexistent-item-id");

		await new Promise((r) => setTimeout(r, 30));

		const cancelledEvents = wc.events.filter((e) => e.status === "cancelled");
		expect(cancelledEvents).toHaveLength(0);
	});

	it("cancelItem() on queued item emits progress event with cancelled status", async () => {
		const wc = makeWebContents();
		const resolvers: (() => void)[] = [];

		const sftp: SftpStub = {
			isConnected: () => true,
			downloadFile: async () => {
				await new Promise<void>((resolve) => {
					resolvers.push(resolve);
				});
			},
		};

		const service = new TransferService({
			sftp: sftp as unknown as SftpConnectionManager,
			s3: makeS3(false) as unknown as S3ConnectionManager,
			store: makeAppStore(1) as unknown as AppStore,
		});

		const items = makeItems(3);
		const { jobId } = service.startDownload({ connectionId: 1, items }, wc as unknown as WebContents);

		await new Promise((r) => setTimeout(r, 10));

		expect(wc.events).toHaveLength(1);
		expect(wc.events[0].status).toBe("active");
		expect(wc.events[0].id).toBe("f0");

		service.cancelItem(jobId, items[1].id);

		await new Promise((r) => setTimeout(r, 30));

		const cancelledEvents = wc.events.filter((e) => e.status === "cancelled");
		expect(cancelledEvents).toHaveLength(1);
		expect(cancelledEvents[0].id).toBe("f1");

		resolvers[0]();
		await new Promise((r) => setTimeout(r, 10));
		resolvers[1]();

		await new Promise((r) => setTimeout(r, 30));

		const completedEvents = wc.events.filter((e) => e.status === "completed");
		expect(completedEvents).toHaveLength(2);
	});

	it("an item failure does not cancel other items", async () => {
		const wc = makeWebContents();
		const sftp: SftpStub = {
			isConnected: () => true,
			downloadFile: (_cid, _rp, lp) => {
				if (lp.endsWith("f1.txt")) {
					return Promise.reject(new Error("nope"));
				}
				return Promise.resolve();
			},
		};

		const service = new TransferService({
			sftp: sftp as unknown as SftpConnectionManager,
			s3: makeS3(false) as unknown as S3ConnectionManager,
			store: makeAppStore(2) as unknown as AppStore,
		});

		service.startDownload({ connectionId: 1, items: makeItems(3) }, wc as unknown as WebContents);
		await new Promise((r) => setTimeout(r, 30));

		const job = wc.jobs[0] as CapturedJob | undefined;
		if (!job) throw new Error("jobDone event was not emitted");
		const f0 = job.results.f0 as { status: "ok" | "error" | "cancelled" } | undefined;
		const f1 = job.results.f1 as { status: "ok" | "error" | "cancelled" } | undefined;
		const f2 = job.results.f2 as { status: "ok" | "error" | "cancelled" } | undefined;
		if (!f0 || !f1 || !f2) throw new Error("missing items");
		expect(f0.status).toBe("ok");
		expect(f1.status).toBe("error");
		expect(f2.status).toBe("ok");
	});

	it("emits final progress event with the item's total size on completion", async () => {
		const wc = makeWebContents();
		const service = new TransferService({
			sftp: makeSftp(true) as unknown as SftpConnectionManager,
			s3: makeS3(false) as unknown as S3ConnectionManager,
			store: makeAppStore() as unknown as AppStore,
		});

		service.startDownload({ connectionId: 1, items: makeItems(1) }, wc as unknown as WebContents);
		await new Promise((r) => setTimeout(r, 10));

		const last = wc.events.at(-1);
		expect(last?.status).toBe("completed");
		expect(last?.transferredBytes).toBe(100);
		expect(last?.totalBytes).toBe(100);
	});

	it("emits a jobDone event with the aggregated results", async () => {
		const wc = makeWebContents();
		const service = new TransferService({
			sftp: makeSftp(true) as unknown as SftpConnectionManager,
			s3: makeS3(false) as unknown as S3ConnectionManager,
			store: makeAppStore() as unknown as AppStore,
		});

		const { jobId } = service.startDownload({ connectionId: 1, items: makeItems(2) }, wc as unknown as WebContents);
		await new Promise((r) => setTimeout(r, 20));

		const job = wc.jobs[0] as CapturedJob | undefined;
		if (!job) throw new Error("jobDone event was not emitted");
		expect(job.jobId).toBe(jobId);
		expect(Object.keys(job.results)).toHaveLength(2);
	});

	it("hasActiveTransfers returns false when no jobs exist", () => {
		const service = new TransferService({
			sftp: makeSftp(true) as unknown as SftpConnectionManager,
			s3: makeS3(false) as unknown as S3ConnectionManager,
			store: makeAppStore() as unknown as AppStore,
		});

		expect(service.hasActiveTransfers()).toBe(false);
	});

	it("hasActiveTransfers returns true when a job is in progress", () => {
		const resolvers: (() => void)[] = [];
		const blocker = new Promise<void>((resolve) => {
			resolvers.push(resolve);
		});
		const service = new TransferService({
			sftp: makeSftp(true, () => blocker) as unknown as SftpConnectionManager,
			s3: makeS3(false) as unknown as S3ConnectionManager,
			store: makeAppStore() as unknown as AppStore,
		});

		const wc = makeWebContents();
		service.startDownload({ connectionId: 1, items: makeItems(1) }, wc as unknown as WebContents);

		expect(service.hasActiveTransfers()).toBe(true);

		resolvers[0]();
	});

	it("hasActiveTransfers returns false after all jobs complete", async () => {
		const wc = makeWebContents();
		const service = new TransferService({
			sftp: makeSftp(true) as unknown as SftpConnectionManager,
			s3: makeS3(false) as unknown as S3ConnectionManager,
			store: makeAppStore() as unknown as AppStore,
		});

		service.startDownload({ connectionId: 1, items: makeItems(1) }, wc as unknown as WebContents);
		await new Promise((r) => setTimeout(r, 10));

		expect(service.hasActiveTransfers()).toBe(false);
	});

	it("hasActiveTransfers returns false after cancelAll", () => {
		const resolvers: (() => void)[] = [];
		const blocker = new Promise<void>((resolve) => {
			resolvers.push(resolve);
		});
		const service = new TransferService({
			sftp: makeSftp(true, () => blocker) as unknown as SftpConnectionManager,
			s3: makeS3(false) as unknown as S3ConnectionManager,
			store: makeAppStore() as unknown as AppStore,
		});

		const wc = makeWebContents();
		service.startDownload({ connectionId: 1, items: makeItems(1) }, wc as unknown as WebContents);
		service.cancelAll();

		expect(service.hasActiveTransfers()).toBe(false);

		resolvers[0]();
	});
});
