import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { S3ConnectionManager } from "./s3-client";

const mockSend = vi.fn();
const mockDestroy = vi.fn();

vi.mock("@aws-sdk/client-s3", () => ({
	S3Client: class {
		send(cmd: unknown) {
			return mockSend(cmd) as Promise<unknown>;
		}
		destroy() {
			mockDestroy();
		}
	},
	ListObjectsV2Command: class {
		constructor(public input: unknown) {}
	},
	HeadBucketCommand: class {
		constructor(public input: unknown) {}
	},
	GetObjectCommand: class {
		constructor(public input: unknown) {}
	},
}));

function makeBody(chunks: Buffer[]) {
	return Readable.from(chunks);
}

describe("S3ConnectionManager.downloadFile", () => {
	let manager: S3ConnectionManager;
	let tempDir: string;

	beforeEach(async () => {
		vi.resetAllMocks();
		tempDir = mkdtempSync(join(tmpdir(), "s3-download-test-"));
		manager = new S3ConnectionManager();

		mockSend.mockImplementation((cmd: { constructor: { name: string } }) => {
			if (cmd.constructor.name === "HeadBucketCommand") {
				return Promise.resolve({});
			}
			return Promise.resolve({});
		});

		await manager.connect(1, {
			accessKey: "AK",
			secretKey: "SK",
			region: "us-east-1",
			bucket: "my-bucket",
			host: "s3.local",
			port: 9000,
			useHttps: false,
		});
	});

	afterEach(() => {
		if (existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it("issues a GetObjectCommand for the normalized key", async () => {
		mockSend.mockImplementation((cmd: { constructor: { name: string } }) => {
			if (cmd.constructor.name === "GetObjectCommand") {
				return Promise.resolve({ Body: makeBody([Buffer.from("ok")]) });
			}
			return Promise.resolve({});
		});

		await manager.downloadFile(1, "/path/to/file.txt", join(tempDir, "out.txt"));

		const calls = mockSend.mock.calls.filter(
			(c) => (c[0] as { constructor: { name: string } }).constructor.name === "GetObjectCommand",
		);
		expect(calls).toHaveLength(1);
	});

	it("strips leading slashes from the S3 key", async () => {
		mockSend.mockImplementation((cmd: { constructor: { name: string } }) => {
			if (cmd.constructor.name === "GetObjectCommand") {
				return Promise.resolve({ Body: makeBody([Buffer.from("ok")]) });
			}
			return Promise.resolve({});
		});

		await manager.downloadFile(1, "//nested/file.txt", join(tempDir, "out.txt"));

		const cmd = mockSend.mock.calls.find(
			(c) => (c[0] as { constructor: { name: string } }).constructor.name === "GetObjectCommand",
		);
		expect(cmd).toBeDefined();
	});

	it("writes the object body to the local file", async () => {
		mockSend.mockImplementation((cmd: { constructor: { name: string } }) => {
			if (cmd.constructor.name === "GetObjectCommand") {
				return Promise.resolve({ Body: makeBody([Buffer.from("hello "), Buffer.from("world")]) });
			}
			return Promise.resolve({});
		});

		const localPath = join(tempDir, "sub", "out.txt");
		await manager.downloadFile(1, "file.txt", localPath);

		expect(readFileSync(localPath, "utf-8")).toBe("hello world");
	});

	it("creates parent directories if they do not exist", async () => {
		mockSend.mockImplementation((cmd: { constructor: { name: string } }) => {
			if (cmd.constructor.name === "GetObjectCommand") {
				return Promise.resolve({ Body: makeBody([Buffer.from("data")]) });
			}
			return Promise.resolve({});
		});

		const localPath = join(tempDir, "x", "y", "z", "out.txt");
		await manager.downloadFile(1, "f.txt", localPath);
		expect(existsSync(localPath)).toBe(true);
	});

	it("invokes the onProgress callback with accumulated bytes", async () => {
		mockSend.mockImplementation((cmd: { constructor: { name: string } }) => {
			if (cmd.constructor.name === "GetObjectCommand") {
				return Promise.resolve({ Body: makeBody([Buffer.alloc(5), Buffer.alloc(7)]) });
			}
			return Promise.resolve({});
		});

		const onProgress = vi.fn();
		await manager.downloadFile(1, "f.txt", join(tempDir, "o"), onProgress);

		expect(onProgress).toHaveBeenCalledWith(5);
		expect(onProgress).toHaveBeenCalledWith(12);
	});

	it("throws when the body is empty", async () => {
		mockSend.mockImplementation((cmd: { constructor: { name: string } }) => {
			if (cmd.constructor.name === "GetObjectCommand") {
				return Promise.resolve({ Body: undefined });
			}
			return Promise.resolve({});
		});

		await expect(manager.downloadFile(1, "f.txt", join(tempDir, "o"))).rejects.toThrow("empty response body");
	});

	it("wraps pipeline errors with a descriptive message", async () => {
		mockSend.mockImplementation((cmd: { constructor: { name: string } }) => {
			if (cmd.constructor.name === "GetObjectCommand") {
				const errBody = new Readable({
					read() {
						this.destroy(new Error("network blip"));
					},
				});
				return Promise.resolve({ Body: errBody });
			}
			return Promise.resolve({});
		});

		await expect(manager.downloadFile(1, "f.txt", join(tempDir, "o"))).rejects.toThrow("network blip");
	});

	it("throws when not connected", async () => {
		await expect(manager.downloadFile(99, "f", join(tempDir, "o"))).rejects.toThrow("Not connected");
	});

	it("rejects when pipeline signal is aborted", async () => {
		const abort = new AbortController();
		let destroyHandler: () => void = () => undefined;

		mockSend.mockImplementation((cmd: { constructor: { name: string } }) => {
			if (cmd.constructor.name === "GetObjectCommand") {
				const body = new Readable({
					read() {
						destroyHandler = () => {
							this.destroy();
						};
					},
				});
				return Promise.resolve({ Body: body });
			}
			return Promise.resolve({});
		});

		const downloadPromise = manager.downloadFile(1, "f.txt", join(tempDir, "out.txt"), undefined, abort.signal);

		await new Promise((r) => setTimeout(r, 10));
		abort.abort();
		destroyHandler();

		await expect(downloadPromise).rejects.toThrow();
	});
});
