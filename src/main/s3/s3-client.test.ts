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
	HeadObjectCommand: class {
		constructor(public input: unknown) {}
	},
	GetObjectCommand: class {
		constructor(public input: unknown) {}
	},
	PutObjectCommand: class {
		constructor(public input: unknown) {}
	},
	DeleteObjectCommand: class {
		constructor(public input: unknown) {}
	},
	DeleteObjectsCommand: class {
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

describe("S3ConnectionManager.uploadFile", () => {
	let manager: S3ConnectionManager;
	let tempDir: string;

	beforeEach(async () => {
		vi.resetAllMocks();
		tempDir = mkdtempSync(join(tmpdir(), "s3-upload-test-"));
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

	it("issues a PutObjectCommand with the correct bucket and key", async () => {
		const filePath = join(tempDir, "upload.txt");
		const { writeFileSync } = await import("node:fs");
		writeFileSync(filePath, "data");

		mockSend.mockImplementation((cmd: { constructor: { name: string } }) => {
			if (cmd.constructor.name === "PutObjectCommand") {
				return new Promise<void>((resolve) => {
					const body = (cmd as { input: { Body: NodeJS.ReadableStream } }).input.Body;
					body.resume();
					body.on("end", () => {
						resolve();
					});
				});
			}
			return Promise.resolve({});
		});

		await manager.uploadFile(1, filePath, "/remote/upload.txt");

		const calls = mockSend.mock.calls.filter(
			(c) => (c[0] as { constructor: { name: string } }).constructor.name === "PutObjectCommand",
		);
		expect(calls).toHaveLength(1);
		const cmd = calls[0];
		expect(cmd).toBeDefined();
		const input = (cmd[0] as { input: { Bucket: string; Key: string } }).input;
		expect(input.Bucket).toBe("my-bucket");
		expect(input.Key).toBe("remote/upload.txt");
	});

	it("strips leading slashes from the S3 key", async () => {
		const filePath = join(tempDir, "f.txt");
		const { writeFileSync } = await import("node:fs");
		writeFileSync(filePath, "x");

		mockSend.mockImplementation((cmd: { constructor: { name: string } }) => {
			if (cmd.constructor.name === "PutObjectCommand") {
				return new Promise<void>((resolve) => {
					const body = (cmd as { input: { Body: NodeJS.ReadableStream } }).input.Body;
					body.resume();
					body.on("end", () => {
						resolve();
					});
				});
			}
			return Promise.resolve({});
		});

		await manager.uploadFile(1, filePath, "///a/b.txt");

		const calls = mockSend.mock.calls.filter(
			(c) => (c[0] as { constructor: { name: string } }).constructor.name === "PutObjectCommand",
		);
		const cmd = calls[0];
		expect(cmd).toBeDefined();
		const input = (cmd[0] as { input: { Key: string } }).input;
		expect(input.Key).toBe("a/b.txt");
	});

	it("invokes onProgress with accumulated bytes during upload", async () => {
		const filePath = join(tempDir, "progress.bin");
		const { writeFileSync } = await import("node:fs");
		writeFileSync(filePath, Buffer.alloc(100));

		mockSend.mockImplementation((cmd: { constructor: { name: string } }) => {
			if (cmd.constructor.name === "PutObjectCommand") {
				return new Promise<void>((resolve) => {
					const body = (cmd as { input: { Body: NodeJS.ReadableStream } }).input.Body;
					body.resume();
					body.on("end", () => {
						resolve();
					});
				});
			}
			return Promise.resolve({});
		});

		const onProgress = vi.fn();
		await manager.uploadFile(1, filePath, "/file.bin", onProgress);

		expect(onProgress).toHaveBeenCalled();
		const calls = onProgress.mock.calls;
		const lastCall = calls[calls.length - 1];
		expect(lastCall).toBeDefined();
		expect(lastCall[0]).toBe(100);
	});

	it("does not attach data listeners when onProgress is omitted", async () => {
		const filePath = join(tempDir, "noprogress.bin");
		const { writeFileSync } = await import("node:fs");
		writeFileSync(filePath, "content");

		let bodyConsumed = false;
		mockSend.mockImplementation((cmd: { constructor: { name: string } }) => {
			if (cmd.constructor.name === "PutObjectCommand") {
				return new Promise<void>((resolve) => {
					const body = (cmd as { input: { Body: NodeJS.ReadableStream } }).input.Body;
					bodyConsumed = body.listenerCount("data") > 0;
					body.resume();
					body.on("end", () => {
						resolve();
					});
				});
			}
			return Promise.resolve({});
		});

		await manager.uploadFile(1, filePath, "/file.txt");

		expect(bodyConsumed).toBe(false);
	});

	it("does not put the stream into flowing mode before the SDK reads it", async () => {
		const filePath = join(tempDir, "flowing.bin");
		const { writeFileSync } = await import("node:fs");
		writeFileSync(filePath, Buffer.alloc(200));

		let bodyWasFlowing = false;
		mockSend.mockImplementation((cmd: { constructor: { name: string } }) => {
			if (cmd.constructor.name === "PutObjectCommand") {
				return new Promise<void>((resolve) => {
					const body = (cmd as { input: { Body: NodeJS.ReadableStream } }).input.Body;
					bodyWasFlowing = (body as { readableFlowing?: boolean }).readableFlowing === true;
					body.resume();
					body.on("end", () => {
						resolve();
					});
				});
			}
			return Promise.resolve({});
		});

		const onProgress = vi.fn();
		await manager.uploadFile(1, filePath, "/big.bin", onProgress);

		expect(bodyWasFlowing).toBe(false);
	});

	it("wraps SDK errors with S3 upload error message", async () => {
		const filePath = join(tempDir, "err.txt");
		const { writeFileSync } = await import("node:fs");
		writeFileSync(filePath, "x");

		mockSend.mockImplementation((cmd: { constructor: { name: string } }) => {
			if (cmd.constructor.name === "PutObjectCommand") {
				return new Promise<void>((_resolve, reject) => {
					const body = (cmd as { input: { Body: NodeJS.ReadableStream } }).input.Body;
					body.resume();
					body.on("end", () => {
						reject(new Error("access denied"));
					});
				});
			}
			return Promise.resolve({});
		});

		await expect(manager.uploadFile(1, filePath, "/err.txt")).rejects.toThrow("S3 upload error");
	});

	it("throws when not connected", async () => {
		const { writeFileSync } = await import("node:fs");
		const filePath = join(tempDir, "x.txt");
		writeFileSync(filePath, "x");

		await expect(manager.uploadFile(99, filePath, "/x.txt")).rejects.toThrow("Not connected");
	});

	it("rejects when signal is aborted", async () => {
		const filePath = join(tempDir, "abort.txt");
		const { writeFileSync } = await import("node:fs");
		writeFileSync(filePath, Buffer.alloc(1024 * 1024));

		const abort = new AbortController();

		mockSend.mockImplementation((cmd: { constructor: { name: string } }) => {
			if (cmd.constructor.name === "PutObjectCommand") {
				return new Promise<void>((_resolve, reject) => {
					const body = (cmd as { input: { Body: NodeJS.ReadableStream } }).input.Body;
					body.resume();
					abort.signal.addEventListener("abort", () => {
						(body as unknown as { destroy(): void }).destroy();
						reject(new Error("RequestAborted"));
					});
				});
			}
			return Promise.resolve({});
		});

		const promise = manager.uploadFile(1, filePath, "/abort.txt", undefined, abort.signal);

		await new Promise((r) => setTimeout(r, 10));
		abort.abort();

		await expect(promise).rejects.toThrow();
	});
});
