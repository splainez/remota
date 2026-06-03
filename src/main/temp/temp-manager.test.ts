import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { TempManager } from "./temp-manager";

describe("TempManager", () => {
	let manager: TempManager;

	beforeEach(() => {
		manager = new TempManager();
	});

	afterEach(async () => {
		await manager.removeAll();
	});

	describe("createTempDir", () => {
		it("creates a temp directory with openscp prefix", async () => {
			const dir = await manager.createTempDir(1);
			expect(dir).toContain("openscp-1-");
			expect(existsSync(dir)).toBe(true);
		});

		it("returns the same path on second call for same connectionId", async () => {
			const dir1 = await manager.createTempDir(1);
			const dir2 = await manager.createTempDir(1);
			expect(dir1).toBe(dir2);
			expect(existsSync(dir1)).toBe(true);
		});

		it("creates different directories for different connectionIds", async () => {
			const dir1 = await manager.createTempDir(1);
			const dir2 = await manager.createTempDir(2);
			expect(dir1).not.toBe(dir2);
		});
	});

	describe("getTempPath", () => {
		it("returns undefined for non-existent connection", () => {
			expect(manager.getTempPath(999)).toBeUndefined();
		});

		it("returns the temp path after creation", async () => {
			const dir = await manager.createTempDir(1);
			expect(manager.getTempPath(1)).toBe(dir);
		});
	});

	describe("removeTempDir", () => {
		it("removes the temp directory", async () => {
			const dir = await manager.createTempDir(1);
			expect(existsSync(dir)).toBe(true);

			await manager.removeTempDir(1);
			expect(existsSync(dir)).toBe(false);
			expect(manager.getTempPath(1)).toBeUndefined();
		});

		it("does not throw when removing non-existent connection", async () => {
			await expect(manager.removeTempDir(999)).resolves.toBeUndefined();
		});
	});

	describe("removeAll", () => {
		it("removes all temp directories", async () => {
			await manager.createTempDir(1);
			await manager.createTempDir(2);
			await manager.createTempDir(3);

			await manager.removeAll();

			expect(manager.getTempPath(1)).toBeUndefined();
			expect(manager.getTempPath(2)).toBeUndefined();
			expect(manager.getTempPath(3)).toBeUndefined();
		});
	});

	describe("writeFile and readFile", () => {
		it("writes and reads a file with remote path structure", async () => {
			await manager.createTempDir(1);
			const content = Buffer.from("Hello, World!");

			await manager.writeFile(1, "/home/user/file.txt", content);

			const read = await manager.readFile(1, "/home/user/file.txt");
			expect(read.toString()).toBe("Hello, World!");
		});

		it("creates parent directories automatically", async () => {
			await manager.createTempDir(1);
			const content = Buffer.from("nested file");

			await manager.writeFile(1, "/a/b/c/d/file.txt", content);

			const read = await manager.readFile(1, "/a/b/c/d/file.txt");
			expect(read.toString()).toBe("nested file");
		});

		it("handles paths without leading slash", async () => {
			await manager.createTempDir(1);
			const content = Buffer.from("no leading slash");

			await manager.writeFile(1, "home/user/file.txt", content);

			const read = await manager.readFile(1, "/home/user/file.txt");
			expect(read.toString()).toBe("no leading slash");
		});

		it("throws when reading non-existent file", async () => {
			await manager.createTempDir(1);
			await expect(manager.readFile(1, "/nonexistent.txt")).rejects.toThrow();
		});
	});

	describe("ensureDir", () => {
		it("creates directory recursively", async () => {
			await manager.createTempDir(1);

			await manager.ensureDir(1, "/home/user/docs");

			const tempPath = manager.getTempPath(1);
			expect(existsSync(join(tempPath ?? "", "home/user/docs"))).toBe(true);
		});
	});

	describe("deletePath", () => {
		it("deletes a file", async () => {
			await manager.createTempDir(1);
			await manager.writeFile(1, "/file.txt", Buffer.from("content"));

			await manager.deletePath(1, "/file.txt");

			expect(await manager.exists(1, "/file.txt")).toBe(false);
		});

		it("deletes a directory recursively", async () => {
			await manager.createTempDir(1);
			await manager.writeFile(1, "/dir/file.txt", Buffer.from("content"));

			await manager.deletePath(1, "/dir");

			expect(await manager.exists(1, "/dir")).toBe(false);
		});
	});

	describe("exists", () => {
		it("returns true for existing path", async () => {
			await manager.createTempDir(1);
			await manager.writeFile(1, "/file.txt", Buffer.from("content"));

			expect(await manager.exists(1, "/file.txt")).toBe(true);
		});

		it("returns false for non-existing path", async () => {
			await manager.createTempDir(1);

			expect(await manager.exists(1, "/nonexistent.txt")).toBe(false);
		});

		it("returns false for non-existent connection", async () => {
			expect(await manager.exists(999, "/file.txt")).toBe(false);
		});
	});

	describe("edge cases", () => {
		it("handles root path /", async () => {
			await manager.createTempDir(1);

			// Writing to root path should work (creates file in temp dir root)
			await manager.writeFile(1, "/rootfile.txt", Buffer.from("root"));
			const read = await manager.readFile(1, "/rootfile.txt");
			expect(read.toString()).toBe("root");
		});

		it("overwrites existing file on second write", async () => {
			await manager.createTempDir(1);
			await manager.writeFile(1, "/file.txt", Buffer.from("first"));
			await manager.writeFile(1, "/file.txt", Buffer.from("second"));

			const read = await manager.readFile(1, "/file.txt");
			expect(read.toString()).toBe("second");
		});

		it("creates new temp dir after removeTempDir", async () => {
			const dir1 = await manager.createTempDir(1);
			await manager.removeTempDir(1);
			const dir2 = await manager.createTempDir(1);

			expect(dir1).not.toBe(dir2);
			expect(existsSync(dir1)).toBe(false);
			expect(existsSync(dir2)).toBe(true);
		});
	});
});
