import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { S3ConnectionManager } from "@main/s3/s3-client";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

import { getS3Connection } from "./containers/index";
import type { S3ConnectionInfo } from "./containers/types";

describe("S3 Navigation", () => {
	let s3: S3ConnectionManager;
	let conn: S3ConnectionInfo;
	const connectionId = 999;
	let tempDir: string;

	beforeAll(() => {
		s3 = new S3ConnectionManager();
		conn = getS3Connection();
		tempDir = mkdtempSync(join(tmpdir(), "s3-integration-"));
	});

	afterAll(() => {
		s3.disconnectAll();
		rmSync(tempDir, { recursive: true, force: true });
	});

	beforeEach(() => {
		s3.disconnectAll();
	});

	it("connects to the S3 server successfully", async () => {
		const homeDir = await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		expect(homeDir).toBe("/");
		expect(s3.isConnected(connectionId)).toBe(true);
	});

	it("returns / as home directory", () => {
		expect(s3.homeDir()).toBe("/");
	});

	it("lists the root directory", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		const entries = await s3.listDirectory(connectionId, "/");

		expect(entries.length).toBeGreaterThan(0);

		const names = entries.map((e) => e.name);
		expect(names).toContain("readable");
		expect(names).toContain("nested");
		expect(names).toContain("binary.bin");
		expect(names).toContain("large.bin");
	});

	it("correctly identifies directories vs files", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		const entries = await s3.listDirectory(connectionId, "/");

		const readable = entries.find((e) => e.name === "readable");
		const nested = entries.find((e) => e.name === "nested");
		const binary = entries.find((e) => e.name === "binary.bin");
		const large = entries.find((e) => e.name === "large.bin");

		expect(readable?.isDirectory).toBe(true);
		expect(nested?.isDirectory).toBe(true);
		expect(binary?.isDirectory).toBe(false);
		expect(large?.isDirectory).toBe(false);
	});

	it("lists files in a subdirectory", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		const entries = await s3.listDirectory(connectionId, "/readable");

		const names = entries.map((e) => e.name);
		expect(names).toContain("hello.txt");

		const hello = entries.find((e) => e.name === "hello.txt");
		expect(hello?.isDirectory).toBe(false);
	});

	it("lists deeply nested files", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		const entries = await s3.listDirectory(connectionId, "/nested/sub");

		const names = entries.map((e) => e.name);
		expect(names).toContain("deep.txt");

		const deepFile = entries.find((e) => e.name === "deep.txt");
		expect(deepFile?.isDirectory).toBe(false);
	});

	it("reports file size for binary files", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		const entries = await s3.listDirectory(connectionId, "/");

		const binary = entries.find((e) => e.name === "binary.bin");
		expect(binary).toBeTruthy();
		if (binary) {
			expect(binary.size).toBeGreaterThan(0);
		}
	});

	it("reports modified timestamps", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		const entries = await s3.listDirectory(connectionId, "/");

		const readable = entries.find((e) => e.name === "readable");
		expect(readable?.modified).toBeTruthy();
		if (readable) {
			expect(readable.modified.length).toBeGreaterThan(0);
		}
	});

	it("getRemoteStat returns stats for an existing file", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		const stat = await s3.getRemoteStat(connectionId, "/readable/hello.txt");

		expect(stat).not.toBeNull();
		expect(stat?.exists).toBe(true);
		expect(stat?.isDirectory).toBe(false);
		expect(stat?.size).toBeGreaterThan(0);
		expect(stat?.modified).toBeTruthy();
	});

	it("getRemoteStat returns null for non-existent file", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		const stat = await s3.getRemoteStat(connectionId, "/nonexistent/file.txt");

		expect(stat).toBeNull();
	});

	it("getRemoteStat returns root as directory", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		const stat = await s3.getRemoteStat(connectionId, "/");

		expect(stat).not.toBeNull();
		expect(stat?.exists).toBe(true);
		expect(stat?.isDirectory).toBe(true);
	});

	it("uploads a file and lists it", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		const localFile = join(tempDir, "upload-test.txt");
		writeFileSync(localFile, "upload test content");

		await s3.uploadFile(connectionId, localFile, "/upload-test.txt");

		const entries = await s3.listDirectory(connectionId, "/");
		const uploaded = entries.find((e) => e.name === "upload-test.txt");

		expect(uploaded).toBeTruthy();
		expect(uploaded?.isDirectory).toBe(false);
		expect(uploaded?.size).toBe("upload test content".length);
	});

	it("uploads a file and downloads it", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		const localFile = join(tempDir, "upload-download.txt");
		const content = "round-trip content";
		writeFileSync(localFile, content);

		await s3.uploadFile(connectionId, localFile, "/round-trip.txt");

		const downloadedFile = join(tempDir, "downloaded.txt");
		await s3.downloadFile(connectionId, "/round-trip.txt", downloadedFile);

		const downloadedContent = readFileSync(downloadedFile, "utf-8");
		expect(downloadedContent).toBe(content);
	});

	it("downloads with onProgress callback", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		const localFile = join(tempDir, "progress-download.txt");
		const content = "progress test data";
		writeFileSync(localFile, content);

		await s3.uploadFile(connectionId, localFile, "/progress-target.txt");

		const downloadedFile = join(tempDir, "progress-result.txt");
		const progressCalls: number[] = [];
		await s3.downloadFile(connectionId, "/progress-target.txt", downloadedFile, (bytes) => {
			progressCalls.push(bytes);
		});

		expect(progressCalls.length).toBeGreaterThan(0);
		const total = progressCalls[progressCalls.length - 1];
		expect(total).toBe(content.length);
	});

	it("uploads with onProgress callback", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		const localFile = join(tempDir, "upload-progress.txt");
		writeFileSync(localFile, Buffer.alloc(1024, 0x42));

		const progressCalls: number[] = [];
		await s3.uploadFile(connectionId, localFile, "/upload-progress-target.txt", (bytes) => {
			progressCalls.push(bytes);
		});

		expect(progressCalls.length).toBeGreaterThan(0);
		const total = progressCalls[progressCalls.length - 1];
		expect(total).toBe(1024);
	});

	it("deletes a single file", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		const localFile = join(tempDir, "delete-me.txt");
		writeFileSync(localFile, "to be deleted");
		await s3.uploadFile(connectionId, localFile, "/delete-me.txt");

		let entries = await s3.listDirectory(connectionId, "/");
		expect(entries.find((e) => e.name === "delete-me.txt")).toBeTruthy();

		await s3.deletePath(connectionId, "/delete-me.txt");

		entries = await s3.listDirectory(connectionId, "/");
		expect(entries.find((e) => e.name === "delete-me.txt")).toBeUndefined();
	});

	it("deletes a directory prefix with multiple files", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		const file1 = join(tempDir, "del-dir-a.txt");
		const file2 = join(tempDir, "del-dir-b.txt");
		writeFileSync(file1, "aaa");
		writeFileSync(file2, "bbb");

		await s3.uploadFile(connectionId, file1, "/del-dir/file1.txt");
		await s3.uploadFile(connectionId, file2, "/del-dir/file2.txt");

		let entries = await s3.listDirectory(connectionId, "/del-dir");
		expect(entries.length).toBe(2);

		await s3.deletePath(connectionId, "/del-dir/");

		entries = await s3.listDirectory(connectionId, "/del-dir");
		expect(entries.length).toBe(0);
	});

	it("throws when listing a non-existent path (empty result)", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		const entries = await s3.listDirectory(connectionId, "/nonexistent-prefix");
		expect(entries.length).toBe(0);
	});

	it("throws when not connected", async () => {
		await expect(s3.listDirectory(99999, "/")).rejects.toThrow("Not connected");
	});

	it("disconnects and is no longer connected", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		expect(s3.isConnected(connectionId)).toBe(true);

		s3.disconnect(connectionId);

		expect(s3.isConnected(connectionId)).toBe(false);
		await expect(s3.listDirectory(connectionId, "/")).rejects.toThrow("Not connected");
	});

	it("reconnects after disconnect", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		s3.disconnect(connectionId);
		expect(s3.isConnected(connectionId)).toBe(false);

		const homeDir = await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		expect(homeDir).toBe("/");
		expect(s3.isConnected(connectionId)).toBe(true);

		const entries = await s3.listDirectory(connectionId, "/");
		expect(entries.length).toBeGreaterThan(0);
	});

	it("manages multiple independent connections", async () => {
		const secondId = 888;

		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		await s3.connect(secondId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		expect(s3.isConnected(connectionId)).toBe(true);
		expect(s3.isConnected(secondId)).toBe(true);

		const entries1 = await s3.listDirectory(connectionId, "/");
		const entries2 = await s3.listDirectory(secondId, "/");

		expect(entries1.length).toBe(entries2.length);

		s3.disconnect(secondId);

		expect(s3.isConnected(connectionId)).toBe(true);
		expect(s3.isConnected(secondId)).toBe(false);

		const stillWorks = await s3.listDirectory(connectionId, "/");
		expect(stillWorks.length).toBeGreaterThan(0);
	});

	it("upload overwrites an existing file", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		const localFile = join(tempDir, "overwrite.txt");
		writeFileSync(localFile, "version1");
		await s3.uploadFile(connectionId, localFile, "/overwrite-test.txt");

		writeFileSync(localFile, "version2-longer");
		await s3.uploadFile(connectionId, localFile, "/overwrite-test.txt");

		const downloadedFile = join(tempDir, "overwrite-result.txt");
		await s3.downloadFile(connectionId, "/overwrite-test.txt", downloadedFile);

		expect(readFileSync(downloadedFile, "utf-8")).toBe("version2-longer");
	});

	it("throws when uploading non-existent local file", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		await expect(
			s3.uploadFile(connectionId, "/nonexistent/local/file.txt", "/remote.txt"),
		).rejects.toThrow();
	});

	it("throws when downloading non-existent remote file", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		const downloadedFile = join(tempDir, "should-not-exist.txt");
		await expect(
			s3.downloadFile(connectionId, "/nonexistent-remote.txt", downloadedFile),
		).rejects.toThrow();
	});

	it("deletePath on root throws", async () => {
		await s3.connect(connectionId, {
			host: "localhost",
			port: 9000,
			accessKey: conn.accessKey,
			secretKey: conn.secretKey,
			region: conn.region,
			bucket: conn.bucket,
			endpoint: conn.endpoint,
			useHttps: false,
		});

		await expect(s3.deletePath(connectionId, "/")).rejects.toThrow("Cannot delete S3 bucket root");
	});
});
