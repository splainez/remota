import { describe, it, expect, vi, afterEach } from "vitest";

const mockOpenPath = vi.fn<(...args: unknown[]) => Promise<string>>().mockResolvedValue("");
const mockExistsSync = vi.fn<(...args: unknown[]) => boolean>();

vi.mock("electron", () => ({
	app: {},
	ipcMain: { handle: vi.fn() },
	shell: { openPath: (...args: unknown[]) => mockOpenPath(...args) },
}));

vi.mock("node:fs", async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import("node:fs")>();
	return {
		...actual,
		existsSync: mockExistsSync,
	};
});

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

	it.skipIf(process.platform !== "win32")("strips trailing backslash from non-root Windows paths", async () => {
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

	it.skipIf(process.platform !== "win32")(
		"does not strip trailing slash from Unix paths on Windows (sep is backslash)",
		async () => {
			({ normalizePath } = await import("./filesystem"));
			expect(normalizePath("/home/")).toBe("/home/");
			expect(normalizePath("/home/user/")).toBe("/home/user/");
		},
	);

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
		mockExistsSync.mockReset();
	});

	it("returns existing drives on Windows", async () => {
		vi.spyOn(process, "platform", "get").mockReturnValue("win32");
		mockExistsSync.mockImplementation((p: unknown) => String(p) === "C:\\" || String(p) === "D:\\");
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

describe("openPath", () => {
	afterEach(() => {
		vi.clearAllMocks();
		mockOpenPath.mockResolvedValue("");
	});

	it("calls shell.openPath and resolves on success", async () => {
		const { openPath } = await import("./filesystem");
		await openPath("/path/to/file.txt");
		expect(mockOpenPath).toHaveBeenCalledWith("/path/to/file.txt");
	});

	it("throws error when shell.openPath returns an error message", async () => {
		mockOpenPath.mockResolvedValue("No application found");
		const { openPath } = await import("./filesystem");
		await expect(openPath("/path/to/file.txt")).rejects.toThrow("No application found");
	});
});
