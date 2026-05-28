import { describe, it, expect } from "vitest";
import { canGoUp, matchesWildcard, parsePath } from "./utils";

describe("canGoUp", () => {
	it("returns false for /", () => {
		expect(canGoUp("/")).toBe(false);
	});

	it("returns false for Windows drive root", () => {
		expect(canGoUp("C:\\")).toBe(false);
		expect(canGoUp("D:\\")).toBe(false);
	});

	it("returns true for normal directory paths", () => {
		expect(canGoUp("C:\\Users")).toBe(true);
		expect(canGoUp("/home/user")).toBe(true);
	});
});

describe("matchesWildcard", () => {
	it("returns true for empty pattern", () => {
		expect(matchesWildcard("", "anything.txt")).toBe(true);
	});

	it("returns true for whitespace-only pattern", () => {
		expect(matchesWildcard("   ", "anything.txt")).toBe(true);
	});

	// --- plain text (no wildcards) = contains match ---

	it("plain text matches files containing the pattern anywhere", () => {
		expect(matchesWildcard("a", "albacete")).toBe(true);
		expect(matchesWildcard("a", "jaen")).toBe(true);
		expect(matchesWildcard("a", "granada")).toBe(true);
		expect(matchesWildcard("a", "readme.md")).toBe(true);
		expect(matchesWildcard("a", "test.txt")).toBe(false);
	});

	it("plain text matches substring in the middle", () => {
		expect(matchesWildcard("ead", "readme.md")).toBe(true);
	});

	it("plain text matches substring at the end", () => {
		expect(matchesWildcard("me.md", "readme.md")).toBe(true);
	});

	it("plain text matches full filename exactly", () => {
		expect(matchesWildcard("readme.md", "readme.md")).toBe(true);
	});

	it("plain text does not match when not contained", () => {
		expect(matchesWildcard("xyz", "readme.md")).toBe(false);
	});

	it("plain text is case-insensitive", () => {
		expect(matchesWildcard("README", "readme.md")).toBe(true);
		expect(matchesWildcard("readme", "README.MD")).toBe(true);
	});

	it("plain text with regex special characters is treated literally", () => {
		expect(matchesWildcard("file.txt", "file.txt")).toBe(true);
		expect(matchesWildcard("file.txt", "fileatxt")).toBe(false);
		expect(matchesWildcard("file.txt", "file1txt")).toBe(false);
	});

	// --- trailing wildcard (starts-with) ---

	it("trailing wildcard matches files starting with pattern", () => {
		expect(matchesWildcard("test*", "test.ts")).toBe(true);
		expect(matchesWildcard("test*", "testing.js")).toBe(true);
		expect(matchesWildcard("test*", "testfolder")).toBe(true);
	});

	it("trailing wildcard does not match files not starting with pattern", () => {
		expect(matchesWildcard("test*", "mytest.ts")).toBe(false);
		expect(matchesWildcard("test*", "best.ts")).toBe(false);
	});

	// --- leading wildcard (ends-with) ---

	it("leading wildcard matches files ending with pattern", () => {
		expect(matchesWildcard("*.ts", "index.ts")).toBe(true);
		expect(matchesWildcard("*.ts", "utils.ts")).toBe(true);
		expect(matchesWildcard("*.json", "config.json")).toBe(true);
	});

	it("leading wildcard does not match files not ending with pattern", () => {
		expect(matchesWildcard("*.ts", "index.js")).toBe(false);
		expect(matchesWildcard("*.ts", "tsutil")).toBe(false);
	});

	it("leading wildcard does not match directory without extension", () => {
		expect(matchesWildcard("*.json", "config")).toBe(false);
	});

	// --- wildcards on both sides (contains with explicit wildcards) ---

	it("wildcards on both sides matches files containing pattern", () => {
		expect(matchesWildcard("*test*", "mytestfile.ts")).toBe(true);
		expect(matchesWildcard("*test*", "testfile.ts")).toBe(true);
		expect(matchesWildcard("*test*", "filetest.ts")).toBe(true);
		expect(matchesWildcard("*test*", "file.ts")).toBe(false);
	});

	// --- wildcard in middle ---

	it("wildcard in middle matches files with prefix and suffix", () => {
		expect(matchesWildcard("test*.ts", "test.ts")).toBe(true);
		expect(matchesWildcard("test*.ts", "testing.ts")).toBe(true);
		expect(matchesWildcard("test*.ts", "testmodule.ts")).toBe(true);
	});

	it("wildcard in middle does not match when suffix doesn't match", () => {
		expect(matchesWildcard("test*.ts", "testing.js")).toBe(false);
		expect(matchesWildcard("test*.ts", "mytest.ts")).toBe(false);
	});

	// --- multiple wildcards ---

	it("multiple wildcards matches compound patterns", () => {
		expect(matchesWildcard("*.module.*", "app.module.css")).toBe(true);
		expect(matchesWildcard("*.module.*", "utils.module.ts")).toBe(true);
		expect(matchesWildcard("*.module.*", "index.module.js")).toBe(true);
	});

	it("multiple wildcards does not match when middle part is missing", () => {
		expect(matchesWildcard("*.module.*", "app.css")).toBe(false);
		expect(matchesWildcard("*.module.*", "module.ts")).toBe(false);
	});

	// --- single asterisk matches everything ---

	it("single asterisk matches all files", () => {
		expect(matchesWildcard("*", "anything")).toBe(true);
		expect(matchesWildcard("*", "file.txt")).toBe(true);
		expect(matchesWildcard("*", ".hidden")).toBe(true);
	});

	// --- edge cases ---

	it("empty filename matches empty pattern", () => {
		expect(matchesWildcard("", "")).toBe(true);
	});

	it("empty filename does not match non-empty plain text", () => {
		expect(matchesWildcard("test", "")).toBe(false);
	});

	it("empty filename matches single asterisk", () => {
		expect(matchesWildcard("*", "")).toBe(true);
	});

	it("plain text matches directories too", () => {
		expect(matchesWildcard("proj", "projects")).toBe(true);
		expect(matchesWildcard("doc", "documents")).toBe(true);
	});

	it("wildcard patterns work with directories", () => {
		expect(matchesWildcard("proj*", "projects")).toBe(true);
		expect(matchesWildcard("*jects", "projects")).toBe(true);
	});
});

describe("parsePath", () => {
	it("parses Unix root path", () => {
		const segments = parsePath("/");
		expect(segments).toEqual([{ label: "/", path: "/" }]);
	});

	it("parses Unix absolute path", () => {
		const segments = parsePath("/home/user/docs");
		expect(segments).toEqual([
			{ label: "/", path: "/" },
			{ label: "home", path: "/home" },
			{ label: "user", path: "/home/user" },
			{ label: "docs", path: "/home/user/docs" },
		]);
	});
});
