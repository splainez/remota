import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Writable } from "node:stream";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { SftpConnectionManager } from "./sftp-client";

const mockCreateReadStream = vi.fn<(...args: unknown[]) => unknown>();
const mockStat = vi.fn();
const mockSetstat = vi.fn();
const mockChmod = vi.fn();
const mockMkdir = vi.fn();

function makeMockWriteStream() {
	let closeHandler: (() => void) | null = null;
	let errorHandler: ((err: Error) => void) | null = null;
	const ws = new Writable({
		write(_chunk, _encoding, cb) {
			cb();
		},
	});
	const originalOn = ws.on.bind(ws);
	vi.spyOn(ws, "on").mockImplementation((event: string | symbol, listener: (...args: unknown[]) => void) => {
		if (event === "close") closeHandler = listener;
		if (event === "error") errorHandler = listener;
		return originalOn(event, listener);
	});
	return {
		stream: ws,
		emitClose: () => {
			if (closeHandler) closeHandler();
		},
		emitError: (err: Error) => {
			if (errorHandler) errorHandler(err);
		},
	};
}

const mockSftp = {
	fastGet: vi.fn(),
	createReadStream: (...args: unknown[]) => mockCreateReadStream(...args),
	createWriteStream: vi.fn(),
	readdir: vi.fn(),
	realpath: vi.fn((_: string, cb: (err: Error | null, path: string) => void) => {
		cb(null, "/tmp");
	}),
	stat: mockStat,
	setstat: mockSetstat,
	chmod: mockChmod,
	mkdir: mockMkdir,
};

const mockClient = {
	on: vi.fn(),
	sftp: vi.fn((cb: (err: Error | null, sftp: unknown) => void) => {
		cb(null, mockSftp);
	}),
	connect: vi.fn(),
	end: vi.fn(),
};

vi.mock("ssh2", () => ({
	Client: class {
		on = mockClient.on;
		sftp = mockClient.sftp;
		connect = mockClient.connect;
		end = mockClient.end;
	},
}));

function makeReadable(chunks: Buffer[]) {
	return new Readable({
		read() {
			for (const chunk of chunks) {
				this.push(chunk);
			}
			this.push(null);
		},
	});
}

function makeErrorReadable(message: string) {
	return new Readable({
		read() {
			this.destroy(new Error(message));
		},
	});
}

describe("SftpConnectionManager.downloadFile", () => {
	let manager: SftpConnectionManager;
	let tempDir: string;

	beforeEach(async () => {
		vi.resetAllMocks();
		tempDir = mkdtempSync(join(tmpdir(), "sftp-download-test-"));
		manager = new SftpConnectionManager();

		mockClient.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
			if (event === "ready") {
				queueMicrotask(() => {
					cb();
				});
			}
		});

		await manager.connect(1, {
			host: "example.com",
			port: 22,
			username: "user",
			authType: "password",
			password: "pass",
		});
	});

	afterEach(() => {
		if (existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true } satisfies Parameters<typeof rmSync>[1]);
		}
	});

	it("writes the remote file contents to the local path", async () => {
		const localPath = join(tempDir, "sub", "out.txt");
		mockCreateReadStream.mockReturnValue(makeReadable([Buffer.from("hello "), Buffer.from("world")]));

		await manager.downloadFile(1, "/remote/file.txt", localPath);

		expect(vi.mocked(mockCreateReadStream)).toHaveBeenCalledWith(
			"/remote/file.txt",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			expect.objectContaining({ highWaterMark: expect.any(Number) }),
		);
		expect(readFileSync(localPath, "utf-8")).toBe("hello world");
	});

	it("creates parent directories if they do not exist", async () => {
		const localPath = join(tempDir, "a", "b", "c", "out.txt");
		mockCreateReadStream.mockReturnValue(makeReadable([Buffer.from("data")]));

		await manager.downloadFile(1, "/remote/file.txt", localPath);
		expect(existsSync(localPath)).toBe(true);
	});

	it("invokes the onProgress callback with bytes read", async () => {
		const localPath = join(tempDir, "out.txt");
		const onProgress = vi.fn();
		mockCreateReadStream.mockReturnValue(makeReadable([Buffer.alloc(10)]));

		await manager.downloadFile(1, "/remote/file.txt", localPath, onProgress);
		expect(onProgress).toHaveBeenCalledWith(10);
	});

	it("rejects when the read stream errors", async () => {
		const localPath = join(tempDir, "out.txt");
		mockCreateReadStream.mockReturnValue(makeErrorReadable("read fail"));

		await expect(manager.downloadFile(1, "/remote/file.txt", localPath)).rejects.toThrow("read fail");
	});

	it("rejects with AbortError when signal is aborted during download", async () => {
		const localPath = join(tempDir, "out.txt");
		const abort = new AbortController();

		let destroyHandler: () => void = () => undefined;
		const readStream = new Readable({
			read() {
				destroyHandler = () => {
					this.destroy();
				};
			},
		});
		mockCreateReadStream.mockReturnValue(readStream);

		const downloadPromise = manager.downloadFile(1, "/remote/big.bin", localPath, undefined, abort.signal);

		await new Promise((r) => setTimeout(r, 10));
		abort.abort();
		destroyHandler();

		await expect(downloadPromise).rejects.toThrow("Aborted");
	});

	it("does not create partial file when abort is triggered before data arrives", async () => {
		const localPath = join(tempDir, "partial.bin");
		const abort = new AbortController();

		const readStream = new Readable({
			read() {
				this.push(Buffer.alloc(1024));
				abort.abort();
				this.destroy();
			},
		});
		mockCreateReadStream.mockReturnValue(readStream);

		await expect(manager.downloadFile(1, "/remote/big.bin", localPath, undefined, abort.signal)).rejects.toThrow(
			"Aborted",
		);
	});
});

describe("SftpConnectionManager.getRemoteStat", () => {
	let manager: SftpConnectionManager;

	beforeEach(async () => {
		vi.resetAllMocks();
		manager = new SftpConnectionManager();

		mockClient.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
			if (event === "ready") {
				queueMicrotask(() => {
					cb();
				});
			}
		});

		await manager.connect(1, {
			host: "example.com",
			port: 22,
			username: "user",
			authType: "password",
			password: "pass",
		});
	});

	it("returns mode, uid, gid from remote stat", async () => {
		mockStat.mockImplementation((_path: string, cb: (err: Error | null, stats: Record<string, unknown>) => void) => {
			cb(null, {
				size: 2048,
				mtime: 1700000000,
				isDirectory: () => false,
				mode: 33188,
				uid: 1000,
				gid: 1000,
			});
		});

		const stat = await manager.getRemoteStat(1, "/remote/file.txt");

		expect(stat).toMatchObject({
			exists: true,
			size: 2048,
			isDirectory: false,
			mode: 33188,
			uid: 1000,
			gid: 1000,
		});
		expect(typeof stat?.modified).toBe("string");
	});

	it("returns null when stat fails", async () => {
		mockStat.mockImplementation((_path: string, cb: (err: Error | null) => void) => {
			cb(new Error("no such file"));
		});

		const stat = await manager.getRemoteStat(1, "/remote/missing.txt");
		expect(stat).toBeNull();
	});
});

describe("SftpConnectionManager.uploadFile", () => {
	let manager: SftpConnectionManager;
	let tempDir: string;

	beforeEach(async () => {
		vi.resetAllMocks();
		tempDir = mkdtempSync(join(tmpdir(), "sftp-upload-test-"));
		manager = new SftpConnectionManager();

		mockClient.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
			if (event === "ready") {
				queueMicrotask(() => {
					cb();
				});
			}
		});

		await manager.connect(1, {
			host: "example.com",
			port: 22,
			username: "user",
			authType: "password",
			password: "pass",
		});

		mockMkdir.mockImplementation((_path: string, cb: (err: Error | null | undefined) => void) => {
			cb(undefined);
		});
	});

	afterEach(() => {
		if (existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true } satisfies Parameters<typeof rmSync>[1]);
		}
	});

	it("uploads file without attrs when none provided", async () => {
		const localPath = join(tempDir, "upload.txt");
		writeFileSync(localPath, "content");
		const mock = makeMockWriteStream();
		mockSftp.createWriteStream.mockReturnValue(mock.stream);

		await manager.uploadFile(1, localPath, "/remote/upload.txt");

		expect(mockSftp.createWriteStream).toHaveBeenCalledWith("/remote/upload.txt");
		expect(mockSetstat).not.toHaveBeenCalled();
	});

	it("calls setstat with provided attrs after successful upload", async () => {
		const localPath = join(tempDir, "upload.txt");
		writeFileSync(localPath, "content");
		const mock = makeMockWriteStream();
		mockSftp.createWriteStream.mockReturnValue(mock.stream);

		mockSetstat.mockImplementation((_path: string, _attrs: unknown, cb: (err: Error | null) => void) => {
			cb(null);
		});

		const uploadPromise = manager.uploadFile(1, localPath, "/remote/upload.txt", undefined, undefined, {
			mode: 33188,
			uid: 1000,
			gid: 1000,
		});

		mock.emitClose();
		await uploadPromise;

		expect(mockSetstat).toHaveBeenCalledWith(
			"/remote/upload.txt",
			{ mode: 33188, uid: 1000, gid: 1000 },
			expect.any(Function),
		);
	});

	it("falls back to chmod when setstat fails", async () => {
		const localPath = join(tempDir, "upload.txt");
		writeFileSync(localPath, "content");
		const mock = makeMockWriteStream();
		mockSftp.createWriteStream.mockReturnValue(mock.stream);

		mockSetstat.mockImplementation((_path: string, _attrs: unknown, cb: (err: Error | null) => void) => {
			cb(new Error("permission denied"));
		});
		mockChmod.mockImplementation((_path: string, _mode: unknown, cb: (err: Error | null) => void) => {
			cb(null);
		});

		const uploadPromise = manager.uploadFile(1, localPath, "/remote/upload.txt", undefined, undefined, {
			mode: 33188,
			uid: 1000,
			gid: 1000,
		});

		mock.emitClose();
		await uploadPromise;

		expect(mockChmod).toHaveBeenCalledWith("/remote/upload.txt", 33188, expect.any(Function));
	});

	it("resolves even when both setstat and chmod fail", async () => {
		const localPath = join(tempDir, "upload.txt");
		writeFileSync(localPath, "content");
		const mock = makeMockWriteStream();
		mockSftp.createWriteStream.mockReturnValue(mock.stream);

		mockSetstat.mockImplementation((_path: string, _attrs: unknown, cb: (err: Error | null) => void) => {
			cb(new Error("setstat failed"));
		});
		mockChmod.mockImplementation((_path: string, _mode: unknown, cb: (err: Error | null) => void) => {
			cb(new Error("chmod failed"));
		});

		const uploadPromise = manager.uploadFile(1, localPath, "/remote/upload.txt", undefined, undefined, {
			mode: 33188,
			uid: 1000,
			gid: 1000,
		});

		mock.emitClose();
		await expect(uploadPromise).resolves.toBeUndefined();
	});

	it("skips setstat when attrs have no mode, uid, or gid", async () => {
		const localPath = join(tempDir, "upload.txt");
		writeFileSync(localPath, "content");
		const mock = makeMockWriteStream();
		mockSftp.createWriteStream.mockReturnValue(mock.stream);

		const uploadPromise = manager.uploadFile(1, localPath, "/remote/upload.txt", undefined, undefined, {});

		mock.emitClose();
		await uploadPromise;

		expect(mockSetstat).not.toHaveBeenCalled();
	});

	it("invokes onProgress callback during upload", async () => {
		const localPath = join(tempDir, "upload.txt");
		writeFileSync(localPath, "content");
		const onProgress = vi.fn();
		const mock = makeMockWriteStream();
		mockSftp.createWriteStream.mockReturnValue(mock.stream);

		const uploadPromise = manager.uploadFile(1, localPath, "/remote/upload.txt", onProgress);

		mock.emitClose();
		await uploadPromise;

		expect(onProgress).toHaveBeenCalled();
	});
});
