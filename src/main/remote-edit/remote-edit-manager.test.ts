const { watchRef, mockWatcher, mockStatSync, mockWatchFn } = vi.hoisted(() => {
	const listeners = new Map<string, ((...args: unknown[]) => void)[]>();
	const emitter = {
		on: (event: string, fn: (...args: unknown[]) => void) => {
			const list = listeners.get(event) ?? [];
			list.push(fn);
			listeners.set(event, list);
			return emitter;
		},
		emit: (event: string, ...args: unknown[]) => {
			for (const fn of listeners.get(event) ?? []) fn(...args);
		},
		removeAllListeners: () => {
			listeners.clear();
		},
		close: vi.fn(),
	};
	const ref = { current: null as (() => void) | null };
	return {
		watchRef: ref,
		mockWatcher: emitter,
		mockStatSync: vi.fn(() => ({ size: 200 })),
		mockWatchFn: vi.fn((_path: string, cb: () => void) => {
			ref.current = cb;
			return emitter;
		}),
	};
});

vi.mock("electron", () => ({
	shell: { openPath: vi.fn().mockResolvedValue("") },
}));

vi.mock("node:fs", () => {
	const mod = {
		watch: mockWatchFn,
		statSync: mockStatSync,
		readFileSync: vi.fn(),
		writeFileSync: vi.fn(),
		existsSync: vi.fn().mockReturnValue(true),
		mkdirSync: vi.fn(),
		rmSync: vi.fn(),
		cpSync: vi.fn(),
		readdirSync: vi.fn().mockReturnValue([]),
		unlinkSync: vi.fn(),
		renameSync: vi.fn(),
		accessSync: vi.fn(),
		constants: { F_OK: 0, R_OK: 4, W_OK: 2, X_OK: 1 },
		createReadStream: vi.fn(),
		createWriteStream: vi.fn(),
		promises: {
			stat: vi.fn(),
			readFile: vi.fn(),
			writeFile: vi.fn(),
			mkdir: vi.fn(),
			rm: vi.fn(),
			cp: vi.fn(),
			readdir: vi.fn(),
			unlink: vi.fn(),
			rename: vi.fn(),
			access: vi.fn(),
		},
	};
	return { default: mod, ...mod };
});

import { tmpdir } from "node:os";
import { join } from "node:path";

import type { S3ConnectionManager } from "@main/s3/s3-client";
import type { SftpConnectionManager } from "@main/sftp/sftp-client";
import type { TempManager } from "@main/temp/temp-manager";
import type { WebContents } from "electron";
import { shell } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RemoteEditManager } from "./remote-edit-manager";

interface SftpStub {
	isConnected: (id: number) => boolean;
	downloadFile: ReturnType<typeof vi.fn>;
	uploadFile: ReturnType<typeof vi.fn>;
	getRemoteStat: (connectionId: number, remotePath: string) => Promise<{ size: number } | null>;
}

interface TempStub {
	getTempPath: (connectionId: number) => string | null;
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
	isDestroyed: () => boolean;
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
		isDestroyed: () => false,
	};
}

function makeSftp(connected: boolean): SftpStub {
	return {
		isConnected: () => connected,
		downloadFile: vi.fn().mockResolvedValue(undefined),
		uploadFile: vi.fn(
			(
				_connectionId: number,
				_localPath: string,
				_remotePath: string,
				_onProgress?: (transferredBytes: number) => void,
				signal?: AbortSignal,
			) =>
				new Promise<void>((_resolve, reject) => {
					if (signal?.aborted) {
						reject(new DOMException("The operation was aborted.", "AbortError"));
						return;
					}
					const onAbort = () => {
						signal?.removeEventListener("abort", onAbort);
						reject(new DOMException("The operation was aborted.", "AbortError"));
					};
					signal?.addEventListener("abort", onAbort, { once: true });
				}),
		),
		getRemoteStat: () => Promise.resolve({ size: 100 }),
	};
}

function makeTemp(): TempStub {
	const root = join(tmpdir(), "openscp-test-1");
	return {
		getTempPath: () => root,
	};
}

function makeManager(opts?: { sftp?: SftpStub; webContents?: WebContentsStub }): {
	manager: RemoteEditManager;
	wc: WebContentsStub;
	sftp: SftpStub;
} {
	const sftp = opts?.sftp ?? makeSftp(true);
	const temp = makeTemp();
	const wc = opts?.webContents ?? makeWebContents();

	const manager = new RemoteEditManager({
		sftp: sftp as unknown as SftpConnectionManager,
		s3: { isConnected: () => false } as unknown as S3ConnectionManager,
		tempManager: temp as unknown as TempManager,
		getWebContents: () => wc as unknown as WebContents,
	});

	return { manager, wc, sftp };
}

function triggerFileChange(): void {
	watchRef.current?.();
}

describe("RemoteEditManager", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		watchRef.current = null;
		mockWatcher.removeAllListeners();
	});

	describe("upload cancellation status", () => {
		it("emits cancelled status when upload is aborted by a new file change", async () => {
			const { manager, wc } = makeManager();

			await manager.startEdit(1, "/remote/file.txt");

			triggerFileChange();
			await vi.advanceTimersByTimeAsync(1000);

			triggerFileChange();
			await vi.advanceTimersByTimeAsync(1000);

			const cancelledEvents = wc.events.filter((e) => e.status === "cancelled" && e.direction === "upload");
			expect(cancelledEvents).toHaveLength(1);
		});

		it("reuses same jobId/itemId across re-uploads for the same session", async () => {
			const { manager, wc } = makeManager();

			await manager.startEdit(1, "/remote/file.txt");

			triggerFileChange();
			await vi.advanceTimersByTimeAsync(1000);

			const uploadEvents1 = wc.events.filter((e) => e.direction === "upload");
			const firstJobId = uploadEvents1[0]?.jobId;
			const firstItemId = uploadEvents1[0]?.id;

			triggerFileChange();
			await vi.advanceTimersByTimeAsync(1000);

			const upload2Events = wc.events.filter((e) => e.status === "active" && e.direction === "upload");
			expect(upload2Events.length).toBeGreaterThanOrEqual(1);

			const lastActive = upload2Events[upload2Events.length - 1];
			expect(lastActive.jobId).toBe(firstJobId);
			expect(lastActive.id).toBe(firstItemId);
		});

		it("shows cancelled then active with same IDs when upload is interrupted mid-flight", async () => {
			const { manager, wc } = makeManager();

			await manager.startEdit(1, "/remote/file.txt");

			triggerFileChange();
			await vi.advanceTimersByTimeAsync(1000);

			const uploadEvents1 = wc.events.filter((e) => e.direction === "upload");
			const firstJobId = uploadEvents1[0]?.jobId;
			const firstItemId = uploadEvents1[0]?.id;

			triggerFileChange();
			await vi.advanceTimersByTimeAsync(1000);

			const statuses = wc.events
				.filter((e) => e.jobId === firstJobId && e.id === firstItemId && e.direction === "upload")
				.map((e) => e.status);

			expect(statuses).toContain("cancelled");
			expect(statuses).toContain("active");
			expect(statuses.length).toBeGreaterThanOrEqual(2);
		});

		it("does not emit completed for a cancelled upload", async () => {
			const { manager, wc } = makeManager();

			await manager.startEdit(1, "/remote/file.txt");

			triggerFileChange();
			await vi.advanceTimersByTimeAsync(1000);

			const uploadEvents1 = wc.events.filter((e) => e.direction === "upload");
			const firstJobId = uploadEvents1[0]?.jobId;
			const firstItemId = uploadEvents1[0]?.id;

			triggerFileChange();
			await vi.advanceTimersByTimeAsync(1000);

			const completedForFirstItem = wc.events.filter(
				(e) => e.jobId === firstJobId && e.id === firstItemId && e.status === "completed" && e.direction === "upload",
			);
			expect(completedForFirstItem).toHaveLength(0);
		});
	});

	describe("TRANSFER_JOB_DONE after successful upload", () => {
		it("emits TRANSFER_JOB_DONE after upload completes", async () => {
			const sftp = makeSftp(true);
			sftp.uploadFile.mockReturnValueOnce(Promise.resolve());
			const { manager, wc } = makeManager({ sftp });

			await manager.startEdit(1, "/remote/file.txt");

			triggerFileChange();
			await vi.advanceTimersByTimeAsync(1000);

			const okJobs = wc.jobs.filter((j) => Object.values(j.results).some((r) => r.status === "ok"));
			expect(okJobs).toHaveLength(1);
		});

		it("does not emit TRANSFER_JOB_DONE when upload is cancelled", async () => {
			const { manager, wc } = makeManager();

			await manager.startEdit(1, "/remote/file.txt");

			triggerFileChange();
			await vi.advanceTimersByTimeAsync(1000);

			triggerFileChange();
			await vi.advanceTimersByTimeAsync(1000);

			const cancelledJobs = wc.jobs.filter((j) => Object.values(j.results).some((r) => r.status === "cancelled"));
			expect(cancelledJobs).toHaveLength(0);
		});
	});

	describe("cancelUpload", () => {
		it("aborts in-flight upload and emits cancelled", async () => {
			const { manager, wc } = makeManager();

			await manager.startEdit(1, "/remote/file.txt");

			triggerFileChange();
			await vi.advanceTimersByTimeAsync(1000);

			const uploadEvents = wc.events.filter((e) => e.direction === "upload");
			const itemId = uploadEvents[0]?.id;

			const cancelled = manager.cancelUpload(itemId);
			expect(cancelled).toBe(true);

			await vi.advanceTimersByTimeAsync(0);

			const cancelledEvents = wc.events.filter(
				(e) => e.id === itemId && e.status === "cancelled" && e.direction === "upload",
			);
			expect(cancelledEvents).toHaveLength(1);
		});

		it("returns false for unknown itemId", () => {
			const { manager } = makeManager();
			expect(manager.cancelUpload("nonexistent")).toBe(false);
		});
	});

	describe("cancelAllUploads", () => {
		it("aborts all in-flight uploads and emits cancelled for each", async () => {
			const { manager, wc } = makeManager();

			await manager.startEdit(1, "/remote/file.txt");

			triggerFileChange();
			await vi.advanceTimersByTimeAsync(1000);

			manager.cancelAllUploads();

			await vi.advanceTimersByTimeAsync(0);

			const uploadEvents = wc.events.filter((e) => e.direction === "upload");
			const itemIds = [...new Set(uploadEvents.map((e) => e.id))];

			for (const itemId of itemIds) {
				const cancelledEvents = wc.events.filter(
					(e) => e.id === itemId && e.status === "cancelled" && e.direction === "upload",
				);
				expect(cancelledEvents.length).toBeGreaterThanOrEqual(1);
			}
		});
	});

	describe("cancelDownload", () => {
		it("aborts in-flight download and emits cancelled", async () => {
			const sftp = makeSftp(true);
			const { manager, wc } = makeManager({ sftp });

			const holder: { fn: (() => void) | null } = { fn: null };
			sftp.downloadFile.mockImplementationOnce(
				// eslint-disable-next-line @typescript-eslint/no-misused-promises -- async mock returning Promise<void> is correct
				(
					_connectionId: number,
					_remotePath: string,
					_localPath: string,
					_onProgress?: (transferredBytes: number) => void,
					signal?: AbortSignal,
				): Promise<void> =>
					new Promise<void>((resolve, reject) => {
						if (signal?.aborted) {
							reject(new DOMException("Aborted", "AbortError"));
							return;
						}
						const onAbort = () => {
							signal?.removeEventListener("abort", onAbort);
							reject(new DOMException("Aborted", "AbortError"));
						};
						signal?.addEventListener("abort", onAbort, { once: true });
						holder.fn = resolve;
					}),
			);

			const editPromise = manager.startEdit(1, "/remote/bigfile.bin");

			await vi.advanceTimersByTimeAsync(0);

			const downloadEvents = wc.events.filter((e) => e.direction === "download" && e.status === "active");
			expect(downloadEvents).toHaveLength(1);
			const downloadItemId = downloadEvents[0].id;

			const cancelled = manager.cancelDownload(downloadItemId);
			expect(cancelled).toBe(true);

			holder.fn?.();

			await editPromise.catch(() => {
				/* noop — expected rejection */
			});

			await vi.advanceTimersByTimeAsync(0);

			const cancelledDownload = wc.events.filter(
				(e) => e.id === downloadItemId && e.status === "cancelled" && e.direction === "download",
			);
			expect(cancelledDownload).toHaveLength(1);
		});

		it("returns false for unknown itemId", () => {
			const { manager } = makeManager();
			expect(manager.cancelDownload("nonexistent")).toBe(false);
		});

		it("does not create session when download is cancelled", async () => {
			const sftp = makeSftp(true);
			const { manager, wc } = makeManager({ sftp });

			sftp.downloadFile.mockImplementationOnce(
				// eslint-disable-next-line @typescript-eslint/no-misused-promises -- async mock returning Promise<void> is correct
				(
					_connectionId: number,
					_remotePath: string,
					_localPath: string,
					_onProgress?: (transferredBytes: number) => void,
					signal?: AbortSignal,
				): Promise<void> =>
					new Promise<void>((_resolve, reject) => {
						const onAbort = () => {
							signal?.removeEventListener("abort", onAbort);
							reject(new DOMException("Aborted", "AbortError"));
						};
						signal?.addEventListener("abort", onAbort, { once: true });
					}),
			);

			const editPromise = manager.startEdit(1, "/remote/bigfile.bin");

			await vi.advanceTimersByTimeAsync(0);

			const downloadEvents = wc.events.filter((e) => e.direction === "download" && e.status === "active");
			manager.cancelDownload(downloadEvents[0].id);

			await editPromise.catch(() => {
				/* noop — expected rejection */
			});

			expect(mockWatchFn).not.toHaveBeenCalled();
		});

		it("does not open file when download is cancelled", async () => {
			const sftp = makeSftp(true);
			const { manager, wc } = makeManager({ sftp });

			sftp.downloadFile.mockImplementationOnce(
				// eslint-disable-next-line @typescript-eslint/no-misused-promises -- async mock returning Promise<void> is correct
				(
					_connectionId: number,
					_remotePath: string,
					_localPath: string,
					_onProgress?: (transferredBytes: number) => void,
					signal?: AbortSignal,
				): Promise<void> =>
					new Promise<void>((_resolve, reject) => {
						const onAbort = () => {
							signal?.removeEventListener("abort", onAbort);
							reject(new DOMException("Aborted", "AbortError"));
						};
						signal?.addEventListener("abort", onAbort, { once: true });
					}),
			);

			const editPromise = manager.startEdit(1, "/remote/bigfile.bin");

			await vi.advanceTimersByTimeAsync(0);

			const downloadEvents = wc.events.filter((e) => e.direction === "download" && e.status === "active");
			manager.cancelDownload(downloadEvents[0].id);

			await editPromise.catch(() => {
				/* noop — expected rejection */
			});

			// eslint-disable-next-line @typescript-eslint/unbound-method -- shell.openPath is mocked
			expect(shell.openPath).not.toHaveBeenCalled();
		});

		it("allows starting new edit after download cancellation", async () => {
			const sftp = makeSftp(true);
			const { manager, wc } = makeManager({ sftp });

			sftp.downloadFile.mockImplementationOnce(
				// eslint-disable-next-line @typescript-eslint/no-misused-promises -- async mock returning Promise<void> is correct
				(
					_connectionId: number,
					_remotePath: string,
					_localPath: string,
					_onProgress?: (transferredBytes: number) => void,
					signal?: AbortSignal,
				): Promise<void> =>
					new Promise<void>((_resolve, reject) => {
						const onAbort = () => {
							signal?.removeEventListener("abort", onAbort);
							reject(new DOMException("Aborted", "AbortError"));
						};
						signal?.addEventListener("abort", onAbort, { once: true });
					}),
			);

			const editPromise = manager.startEdit(1, "/remote/bigfile.bin");

			await vi.advanceTimersByTimeAsync(0);

			const downloadEvents = wc.events.filter((e) => e.direction === "download" && e.status === "active");
			manager.cancelDownload(downloadEvents[0].id);

			await editPromise.catch(() => {
				/* noop — expected rejection */
			});

			const result = await manager.startEdit(1, "/remote/bigfile.bin");

			const expectedPath = join(tmpdir(), "openscp-test-1", "remote", "bigfile.bin");
			expect(result.tempPath).toBe(expectedPath);
			// eslint-disable-next-line @typescript-eslint/unbound-method -- shell.openPath is mocked
			expect(shell.openPath).toHaveBeenCalledWith(expectedPath);
		});
	});

	describe("cancelAllDownloads", () => {
		it("aborts all in-flight downloads and emits cancelled", async () => {
			const sftp = makeSftp(true);
			const { manager, wc } = makeManager({ sftp });

			sftp.downloadFile.mockImplementation(
				// eslint-disable-next-line @typescript-eslint/no-misused-promises -- async mock returning Promise<void> is correct
				(
					_connectionId: number,
					_remotePath: string,
					_localPath: string,
					_onProgress?: (transferredBytes: number) => void,
					signal?: AbortSignal,
				): Promise<void> =>
					new Promise<void>((_resolve, reject) => {
						const onAbort = () => {
							signal?.removeEventListener("abort", onAbort);
							reject(new DOMException("Aborted", "AbortError"));
						};
						signal?.addEventListener("abort", onAbort, { once: true });
					}),
			);

			const edit1 = manager.startEdit(1, "/remote/file1.bin");
			const edit2 = manager.startEdit(2, "/remote/file2.bin");

			await vi.advanceTimersByTimeAsync(0);

			manager.cancelAllDownloads();

			await Promise.allSettled([edit1, edit2]);

			await vi.advanceTimersByTimeAsync(0);

			const cancelledDownloads = wc.events.filter((e) => e.status === "cancelled" && e.direction === "download");
			expect(cancelledDownloads).toHaveLength(2);
		});
	});

	describe("startEdit", () => {
		it("downloads the file and opens it with the OS editor", async () => {
			const { manager } = makeManager();

			const result = await manager.startEdit(1, "/remote/file.txt");

			const expectedPath = join(tmpdir(), "openscp-test-1", "remote", "file.txt");
			expect(result.tempPath).toBe(expectedPath);
			// eslint-disable-next-line @typescript-eslint/unbound-method -- shell.openPath is mocked
			expect(shell.openPath).toHaveBeenCalledWith(expectedPath);
		});

		it("emits download progress events", async () => {
			const { manager, wc } = makeManager();

			await manager.startEdit(1, "/remote/file.txt");

			const downloadEvents = wc.events.filter((e) => e.direction === "download");
			const statuses = downloadEvents.map((e) => e.status);
			expect(statuses).toContain("queued");
			expect(statuses).toContain("active");
			expect(statuses).toContain("completed");
		});

		it("re-downloads and re-opens on re-call for same file", async () => {
			const { manager } = makeManager();

			const first = await manager.startEdit(1, "/remote/file.txt");
			const second = await manager.startEdit(1, "/remote/file.txt");

			expect(second.tempPath).toBe(first.tempPath);
			// eslint-disable-next-line @typescript-eslint/unbound-method -- shell.openPath is mocked
			expect(shell.openPath).toHaveBeenCalledTimes(2);
		});

		it("starts a file watcher", async () => {
			const { manager } = makeManager();

			await manager.startEdit(1, "/remote/file.txt");

			const expectedPath = join(tmpdir(), "openscp-test-1", "remote", "file.txt");
			expect(mockWatchFn).toHaveBeenCalledWith(expectedPath, expect.any(Function));
		});

		it("does not start a file watcher when watch=false", async () => {
			const { manager } = makeManager();

			await manager.startEdit(1, "/remote/file.txt", { watch: false });

			expect(mockWatchFn).not.toHaveBeenCalled();
		});

		it("tracks session even when watch=false for cleanup", async () => {
			const { manager } = makeManager();

			await manager.startEdit(1, "/remote/file.txt", { watch: false });

			manager.stopEdit(1, "/remote/file.txt");
			// Should not throw — session existed and was cleaned up
		});

		it("passes AbortSignal to download function", async () => {
			const sftp = makeSftp(true);
			const { manager } = makeManager({ sftp });

			await manager.startEdit(1, "/remote/file.txt");

			expect(sftp.downloadFile).toHaveBeenCalledWith(
				1,
				"/remote/file.txt",
				expect.any(String),
				expect.any(Function),
				expect.any(AbortSignal),
			);
		});
	});

	describe("stopEdit", () => {
		it("closes the file watcher", async () => {
			const { manager } = makeManager();

			await manager.startEdit(1, "/remote/file.txt");
			manager.stopEdit(1, "/remote/file.txt");

			expect(mockWatcher.close).toHaveBeenCalled();
		});

		it("clears the debounce timer", async () => {
			const { manager, wc } = makeManager();

			await manager.startEdit(1, "/remote/file.txt");
			triggerFileChange();
			manager.stopEdit(1, "/remote/file.txt");

			await vi.advanceTimersByTimeAsync(1000);

			const uploadEvents = wc.events.filter((e) => e.direction === "upload");
			expect(uploadEvents).toHaveLength(0);
		});

		it("aborts in-flight upload", async () => {
			const { manager, wc } = makeManager();

			await manager.startEdit(1, "/remote/file.txt");
			triggerFileChange();
			await vi.advanceTimersByTimeAsync(1000);

			manager.stopEdit(1, "/remote/file.txt");

			await vi.advanceTimersByTimeAsync(0);

			const cancelledEvents = wc.events.filter((e) => e.status === "cancelled" && e.direction === "upload");
			expect(cancelledEvents).toHaveLength(1);
		});

		it("is a no-op for unknown session", () => {
			const { manager } = makeManager();
			manager.stopEdit(1, "/nonexistent/file.txt");
		});
	});

	describe("stopAllForConnection", () => {
		it("stops all sessions for the given connection", async () => {
			const { manager } = makeManager();

			await manager.startEdit(1, "/remote/file1.txt");
			await manager.startEdit(1, "/remote/file2.txt");

			manager.stopAllForConnection(1);

			expect(mockWatcher.close).toHaveBeenCalledTimes(2);
		});

		it("does not stop sessions for other connections", async () => {
			const { manager } = makeManager();

			await manager.startEdit(1, "/remote/file.txt");
			await manager.startEdit(2, "/remote/file.txt");

			manager.stopAllForConnection(1);

			expect(mockWatcher.close).toHaveBeenCalledTimes(1);
		});
	});

	describe("stopAll", () => {
		it("stops all active sessions", async () => {
			const { manager } = makeManager();

			await manager.startEdit(1, "/remote/file1.txt");
			await manager.startEdit(1, "/remote/file2.txt");

			manager.stopAll();

			expect(mockWatcher.close).toHaveBeenCalledTimes(2);
		});
	});

	describe("path traversal", () => {
		it("rejects paths that escape the temp directory", async () => {
			const { manager } = makeManager();

			await expect(manager.startEdit(1, "/remote/../../etc/passwd")).rejects.toThrow("Path traversal detected");
		});
	});

	describe("error handling", () => {
		it("propagates download failure", async () => {
			const sftp = makeSftp(true);
			sftp.downloadFile.mockRejectedValue(new Error("download failed"));
			const { manager } = makeManager({ sftp });

			await expect(manager.startEdit(1, "/remote/file.txt")).rejects.toThrow("download failed");
		});

		it("propagates getRemoteStat failure", async () => {
			const sftp = makeSftp(true);
			sftp.getRemoteStat = () => Promise.reject(new Error("stat failed"));
			const { manager } = makeManager({ sftp });

			await expect(manager.startEdit(1, "/remote/file.txt")).rejects.toThrow("stat failed");
		});
	});
});
