import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useFileList } from "./useFileList";
import type { FileEntry } from "../../shared/types";

describe("useFileList", () => {
	it("returns loading state initially", () => {
		const { result } = renderHook(() => useFileList("/home", false));
		expect(result.current.loading).toBe(true);
		expect(result.current.entries).toEqual([]);
		expect(result.current.error).toBeNull();
	});

	it("loads local directory listing via IPC", async () => {
		const mockEntries: FileEntry[] = [
			{ name: "src", fullPath: "/home/src", isDirectory: true, size: 0, modified: "2025-01-01T00:00:00Z" },
		];
		window.api.filesystem.list = vi.fn().mockResolvedValue(mockEntries);

		const { result } = renderHook(() => useFileList("/home", false));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.entries).toEqual(mockEntries);
		expect(window.api.filesystem.list).toHaveBeenCalledWith("/home");
	});

	it("loads mock data for remote connections", async () => {
		const { result } = renderHook(() => useFileList("/home/admin", true));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.entries.length).toBeGreaterThan(0);
		expect(result.current.entries.some((e) => e.name === "projects")).toBe(true);
		expect(result.current.entries.some((e) => e.name === "backups")).toBe(true);
		expect(result.current.entries.some((e) => e.name === "notes.txt")).toBe(true);
	});

	it("returns mock entries for remote root /", async () => {
		const { result } = renderHook(() => useFileList("/", true));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.entries.some((e) => e.name === "home")).toBe(true);
		expect(result.current.entries.some((e) => e.name === "etc")).toBe(true);
		expect(result.current.entries.some((e) => e.name === "README.md")).toBe(true);
	});

	it("handles IPC errors", async () => {
		window.api.filesystem.list = vi.fn().mockRejectedValue(new Error("Access denied"));

		const { result } = renderHook(() => useFileList("/root", false));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.error).toBeTruthy();
		expect(result.current.entries).toEqual([]);
	});

	it("refresh reloads the directory listing", async () => {
		const firstEntries: FileEntry[] = [{ name: "a.txt", fullPath: "/tmp/a.txt", isDirectory: false, size: 10, modified: "" }];
		const refreshedEntries: FileEntry[] = [
			{ name: "a.txt", fullPath: "/tmp/a.txt", isDirectory: false, size: 10, modified: "" },
			{ name: "b.txt", fullPath: "/tmp/b.txt", isDirectory: false, size: 20, modified: "" },
		];
		const listMock = vi
			.fn()
			.mockResolvedValueOnce(firstEntries)
			.mockResolvedValueOnce(refreshedEntries);
		window.api.filesystem.list = listMock;

		const { result } = renderHook(() => useFileList("/tmp", false));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});
		expect(result.current.entries).toEqual(firstEntries);

		await act(async () => {
			await result.current.refresh();
		});

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});
		expect(result.current.entries).toEqual(refreshedEntries);
		expect(listMock).toHaveBeenCalledTimes(2);
	});
});
