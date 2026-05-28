import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useLocalDrives } from "./useLocalDrives";

vi.mock("../store/platform", () => ({
	usePlatformStore: vi.fn(),
}));

describe("useLocalDrives", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		const { usePlatformStore } = await import("../store/platform");
		vi.mocked(usePlatformStore).mockImplementation(
			(selector?: (s: { isWindows: boolean }) => unknown) => {
				const state = { isWindows: true };
				if (selector) return selector(state);
				return state;
			},
		);
	});

	it("lists drives on Windows", async () => {
		const mockDrives = ["C:\\", "D:\\", "E:\\"];
		(window as unknown as { api: { filesystem: { listDrives: () => Promise<string[]> } } }).api = {
			filesystem: {
				listDrives: vi.fn().mockResolvedValue(mockDrives),
			},
		};

		const { result } = renderHook(() => useLocalDrives("C:\\"));
		await waitFor(() => {
			expect(result.current.drives).toEqual(mockDrives);
		});
	});

	it("detects driveRoot when currentPath matches a drive", async () => {
		(window as unknown as { api: { filesystem: { listDrives: () => Promise<string[]> } } }).api = {
			filesystem: {
				listDrives: vi.fn().mockResolvedValue(["C:\\"]),
			},
		};

		const { result } = renderHook(() => useLocalDrives("C:\\"));
		await waitFor(() => {
			expect(result.current.driveRoot).toBe("C:\\");
		});
	});

	it("driveRoot is null when currentPath does not match any drive", async () => {
		(window as unknown as { api: { filesystem: { listDrives: () => Promise<string[]> } } }).api = {
			filesystem: {
				listDrives: vi.fn().mockResolvedValue(["C:\\", "D:\\"]),
			},
		};

		const { result } = renderHook(() => useLocalDrives("C:\\Users"));
		await waitFor(() => {
			expect(result.current.driveRoot).toBeNull();
		});
	});

	it("driveRoot is null when not on Windows", async () => {
		const { usePlatformStore } = await import("../store/platform");
		vi.mocked(usePlatformStore).mockImplementation(
			(selector?: (s: { isWindows: boolean }) => unknown) => {
				const state = { isWindows: false };
				if (selector) return selector(state);
				return state;
			},
		);

		const { result } = renderHook(() => useLocalDrives("/home/user"));
		expect(result.current.isWindows).toBe(false);
		expect(result.current.driveRoot).toBeNull();
		expect(result.current.drives).toEqual([]);
	});
});
