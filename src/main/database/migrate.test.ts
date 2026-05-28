import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { migrateFromSqlite } from "./migrate";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("migrateFromSqlite", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "openscp-mig-"));
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("skips when connections.json already exists", async () => {
		const jsonPath = join(tmpDir, "connections.json");
		writeFileSync(jsonPath, JSON.stringify({ nextId: 1, connections: [] }), "utf-8");
		const result = await migrateFromSqlite(tmpDir, jsonPath);
		expect(result).toBe(false);
	});

	it("skips when no openscp.db exists", async () => {
		const jsonPath = join(tmpDir, "connections.json");
		const result = await migrateFromSqlite(tmpDir, jsonPath);
		expect(result).toBe(false);
	});

	it("skips when both files are missing", async () => {
		const jsonPath = join(tmpDir, "connections.json");
		const result = await migrateFromSqlite(tmpDir, jsonPath);
		expect(result).toBe(false);
	});

	it("skips when connections.json path is a different file", async () => {
		writeFileSync(join(tmpDir, "openscp.db"), "not-a-real-db");
		const jsonPath = join(tmpDir, "connections.json");
		writeFileSync(jsonPath, "[]");
		const result = await migrateFromSqlite(tmpDir, jsonPath);
		expect(result).toBe(false);
		expect(existsSync(join(tmpDir, "openscp.db"))).toBe(true);
	});

	it("does not crash on corrupt database", async () => {
		writeFileSync(join(tmpDir, "openscp.db"), Buffer.from([0x01, 0x02, 0x03]));
		const jsonPath = join(tmpDir, "connections.json");
		const result = await migrateFromSqlite(tmpDir, jsonPath);
		expect(result).toBe(false);
	});
});
