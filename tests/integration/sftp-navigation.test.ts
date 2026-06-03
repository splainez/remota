import { SftpConnectionManager } from "@main/sftp/sftp-client";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { getSftpConnection } from "./containers/index";
import type { ConnectionInfo } from "./containers/types";

describe("SFTP Navigation", () => {
	let sftp: SftpConnectionManager;
	let conn: ConnectionInfo;
	const connectionId = 999;

	beforeAll(() => {
		sftp = new SftpConnectionManager();
		conn = getSftpConnection();
	});

	afterAll(() => {
		sftp.disconnectAll();
	});

	it("connects to the SFTP server successfully", async () => {
		const homeDir = await sftp.connect(connectionId, {
			host: conn.host,
			port: conn.port,
			username: conn.username,
			authType: "password",
			password: conn.password,
		});

		expect(homeDir).toBeTruthy();
		expect(homeDir.length).toBeGreaterThan(0);
		expect(sftp.isConnected(connectionId)).toBe(true);
	});

	it("lists the home directory root", async () => {
		const homeDir = await sftp.homeDir(connectionId);
		const entries = await sftp.listDirectory(connectionId, homeDir);

		expect(entries.length).toBeGreaterThan(0);

		const names = entries.map((e) => e.name);
		expect(names).toContain("readable");
		expect(names).toContain("writable");
		expect(names).toContain("nested");
		expect(names).toContain("binary.bin");
		expect(names).toContain("large.bin");
	});

	it("correctly identifies directories vs files", async () => {
		const homeDir = await sftp.homeDir(connectionId);
		const entries = await sftp.listDirectory(connectionId, homeDir);

		const readable = entries.find((e) => e.name === "readable");
		const nested = entries.find((e) => e.name === "nested");
		const binary = entries.find((e) => e.name === "binary.bin");
		const large = entries.find((e) => e.name === "large.bin");

		expect(readable?.isDirectory).toBe(true);
		expect(nested?.isDirectory).toBe(true);
		expect(binary?.isDirectory).toBe(false);
		expect(large?.isDirectory).toBe(false);
	});

	it("lists nested subdirectories", async () => {
		const homeDir = await sftp.homeDir(connectionId);
		const nestedPath = `${homeDir}/nested`;
		const entries = await sftp.listDirectory(connectionId, nestedPath);

		const names = entries.map((e) => e.name);
		expect(names).toContain("sub");
	});

	it("lists deeply nested files", async () => {
		const homeDir = await sftp.homeDir(connectionId);
		const subPath = `${homeDir}/nested/sub`;
		const entries = await sftp.listDirectory(connectionId, subPath);

		const names = entries.map((e) => e.name);
		expect(names).toContain("deep.txt");

		const deepFile = entries.find((e) => e.name === "deep.txt");
		expect(deepFile?.isDirectory).toBe(false);
		expect(deepFile).toBeTruthy();
	});

	it("lists files in a readable directory", async () => {
		const homeDir = await sftp.homeDir(connectionId);
		const readablePath = `${homeDir}/readable`;
		const entries = await sftp.listDirectory(connectionId, readablePath);

		const names = entries.map((e) => e.name);
		expect(names).toContain("hello.txt");

		const hello = entries.find((e) => e.name === "hello.txt");
		expect(hello?.isDirectory).toBe(false);
	});

	it("reports file size for binary files", async () => {
		const homeDir = await sftp.homeDir(connectionId);
		const entries = await sftp.listDirectory(connectionId, homeDir);

		const binary = entries.find((e) => e.name === "binary.bin");
		expect(binary).toBeTruthy();
		if (binary) {
			expect(binary.size).toBeGreaterThan(0);
		}
	});

	it("reports modified timestamps", async () => {
		const homeDir = await sftp.homeDir(connectionId);
		const entries = await sftp.listDirectory(connectionId, homeDir);

		const readable = entries.find((e) => e.name === "readable");
		expect(readable?.modified).toBeTruthy();
		if (readable) {
			expect(readable.modified.length).toBeGreaterThan(0);
		}
	});

	it("throws when listing a non-existent path", async () => {
		await expect(sftp.listDirectory(connectionId, "/nonexistent/path/xyz")).rejects.toThrow();
	});

	it("disconnects and is no longer connected", async () => {
		await sftp.disconnect(connectionId);
		expect(sftp.isConnected(connectionId)).toBe(false);

		await expect(sftp.listDirectory(connectionId, "/")).rejects.toThrow("Not connected");
	});

	it("reconnects after disconnect", async () => {
		const homeDir = await sftp.connect(connectionId, {
			host: conn.host,
			port: conn.port,
			username: conn.username,
			authType: "password",
			password: conn.password,
		});

		expect(homeDir).toBeTruthy();
		expect(sftp.isConnected(connectionId)).toBe(true);

		const entries = await sftp.listDirectory(connectionId, homeDir);
		expect(entries.length).toBeGreaterThan(0);

		const names = entries.map((e) => e.name);
		expect(names).toContain("nested");
	});

	it("manages multiple independent connections", async () => {
		const secondId = 888;
		const homeDir = await sftp.homeDir(connectionId);

		await sftp.connect(secondId, {
			host: conn.host,
			port: conn.port,
			username: conn.username,
			authType: "password",
			password: conn.password,
		});

		expect(sftp.isConnected(connectionId)).toBe(true);
		expect(sftp.isConnected(secondId)).toBe(true);

		const entries1 = await sftp.listDirectory(connectionId, homeDir);
		const entries2 = await sftp.listDirectory(secondId, homeDir);

		expect(entries1.length).toBe(entries2.length);

		await sftp.disconnect(secondId);
		expect(sftp.isConnected(connectionId)).toBe(true);
		expect(sftp.isConnected(secondId)).toBe(false);

		const stillWorks = await sftp.listDirectory(connectionId, homeDir);
		expect(stillWorks.length).toBeGreaterThan(0);
	});
});
