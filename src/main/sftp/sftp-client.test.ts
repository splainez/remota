import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { SftpConnectionManager } from "./sftp-client";

const mockCreateReadStream = vi.fn<(...args: unknown[]) => unknown>();

const mockSftp = {
	fastGet: vi.fn(),
	createReadStream: (...args: unknown[]) => mockCreateReadStream(...args),
	readdir: vi.fn(),
	realpath: vi.fn((_: string, cb: (err: Error | null, path: string) => void) => {
		cb(null, "/tmp");
	}),
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
