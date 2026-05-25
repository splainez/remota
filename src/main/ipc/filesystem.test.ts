import { describe, it, expect, vi, afterEach } from "vitest";

describe("normalizePath", () => {
	let normalizePath: (input: string) => string;

	it("preserves Windows drive root (C:\\)", async () => {
		({ normalizePath } = await import("./filesystem"));
		expect(normalizePath("C:\\")).toBe("C:\\");
	});

	it("preserves Windows drive root (D:\\)", async () => {
		({ normalizePath } = await import("./filesystem"));
		expect(normalizePath("D:\\")).toBe("D:\\");
	});

	it("strips trailing backslash from non-root Windows paths", async () => {
		({ normalizePath } = await import("./filesystem"));
		expect(normalizePath("C:\\Users\\")).toBe("C:\\Users");
		expect(normalizePath("C:\\Users\\Sergio\\")).toBe("C:\\Users\\Sergio");
	});

	it("leaves Windows paths without trailing backslash unchanged", async () => {
		({ normalizePath } = await import("./filesystem"));
		expect(normalizePath("C:\\Users")).toBe("C:\\Users");
		expect(normalizePath("C:\\Users\\Sergio")).toBe("C:\\Users\\Sergio");
	});

	it("preserves Unix root", async () => {
		({ normalizePath } = await import("./filesystem"));
		expect(normalizePath("/")).toBe("/");
	});

	it("does not strip trailing slash from Unix paths on Windows (sep is backslash)", async () => {
		({ normalizePath } = await import("./filesystem"));
		expect(normalizePath("/home/")).toBe("/home/");
		expect(normalizePath("/home/user/")).toBe("/home/user/");
	});

	it("leaves Unix paths without trailing backslash unchanged", async () => {
		({ normalizePath } = await import("./filesystem"));
		expect(normalizePath("/home")).toBe("/home");
		expect(normalizePath("/home/user")).toBe("/home/user");
	});
});

describe("listDrives", () => {
	let listDrives: () => string[];

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns existing drives on Windows", async () => {
		vi.spyOn(process, "platform", "get").mockReturnValue("win32");
		vi.doMock("node:fs", () => ({
			existsSync: vi.fn((p: unknown) => String(p) === "C:\\" || String(p) === "D:\\"),
		}));
		({ listDrives } = await import("./filesystem"));
		const drives = listDrives();
		expect(drives).toContain("C:\\");
		expect(drives).toContain("D:\\");
	});

	it("returns [/] on non-Windows platforms", async () => {
		vi.spyOn(process, "platform", "get").mockReturnValue("linux");
		({ listDrives } = await import("./filesystem"));
		expect(listDrives()).toEqual(["/"]);
	});
});

