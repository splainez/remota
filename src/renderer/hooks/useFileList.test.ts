import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useFileList } from "./useFileList";
import type { FileEntry } from "../../shared/types";

describe("useFileList", () => {
	it("returns loading state initially (local)", () => {
		const { result } = renderHook(() => useFileList("/home"));
		expect(result.current.loading).toBe(true);
		expect(result.current.entries).toEqual([]);
		expect(result.current.error).toBeNull();
	});

	it("returns loading state initially (remote)", () => {
		const { result } = renderHook(() =>
			useFileList("/home", { type: "remote", connectionId: 1 }),
		);
		expect(result.current.loading).toBe(true);
		expect(result.current.entries).toEqual([]);
		expect(result.current.error).toBeNull();
	});

	it("loads local directory listing via IPC", async () => {
		const mockEntries: FileEntry[] = [
			{ name: "src", fullPath: "/home/src", isDirectory: true, size: 0, modified: "2025-01-01T00:00:00Z" },
		];
		window.api.filesystem.list = vi.fn().mockResolvedValue(mockEntries);

		const { result } = renderHook(() => useFileList("/home"));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.entries).toEqual(mockEntries);
		expect(window.api.filesystem.list).toHaveBeenCalledWith("/home");
	});

	it("loads remote directory listing via IPC", async () => {
		const mockEntries: FileEntry[] = [
			{ name: "admin", fullPath: "/home/admin", isDirectory: true, size: 0, modified: "2025-01-01T00:00:00Z" },
			{ name: ".bashrc", fullPath: "/home/.bashrc", isDirectory: false, size: 512, modified: "2024-11-01T10:00:00Z" },
		];
		window.api.filesystem.remoteList = vi.fn().mockResolvedValue(mockEntries);

		const { result } = renderHook(() =>
			useFileList("/home", { type: "remote", connectionId: 1 }),
		);

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.entries).toEqual(mockEntries);
		expect(window.api.filesystem.remoteList).toHaveBeenCalledWith(1, "/home");
	});

	it("handles local IPC errors with structured error info", async () => {
		window.api.filesystem.list = vi.fn().mockRejectedValue(new Error("Access denied"));

		const { result } = renderHook(() => useFileList("/root"));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.error).not.toBeNull();
		expect(result.current.error?.code).toBe("PERMISSION_DENIED");
		expect(result.current.error?.technicalDetail).toBe("Access denied");
		expect(result.current.entries).toEqual([]);
	});

	it("handles remote IPC errors with structured error info", async () => {
		window.api.filesystem.remoteList = vi
			.fn()
			.mockRejectedValue(new Error("Not connected to remote server"));

		const { result } = renderHook(() =>
			useFileList("/etc", { type: "remote", connectionId: 1 }),
		);

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.error).not.toBeNull();
		expect(result.current.error?.code).toBe("NOT_CONNECTED");
		expect(result.current.entries).toEqual([]);
	});

	it("classifies connection refused errors", async () => {
		window.api.filesystem.remoteList = vi
			.fn()
			.mockRejectedValue(new Error("connect ECONNREFUSED 192.168.1.1:22"));

		const { result } = renderHook(() =>
			useFileList("/var", { type: "remote", connectionId: 1 }),
		);

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.error?.code).toBe("CONNECTION_REFUSED");
	});

	it("classifies auth failed errors", async () => {
		window.api.filesystem.remoteList = vi
			.fn()
			.mockRejectedValue(new Error("All configured authentication methods failed"));

		const { result } = renderHook(() =>
			useFileList("/var", { type: "remote", connectionId: 1 }),
		);

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.error?.code).toBe("AUTH_FAILED");
	});

	it("classifies timeout errors", async () => {
		window.api.filesystem.remoteList = vi
			.fn()
			.mockRejectedValue(new Error("Timed out while waiting for handshake"));

		const { result } = renderHook(() =>
			useFileList("/var", { type: "remote", connectionId: 1 }),
		);

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.error?.code).toBe("CONNECTION_TIMEOUT");
	});

	it("classifies host unreachable errors", async () => {
		window.api.filesystem.remoteList = vi
			.fn()
			.mockRejectedValue(new Error("getaddrinfo ENOTFOUND nonexistenthost"));

		const { result } = renderHook(() =>
			useFileList("/var", { type: "remote", connectionId: 1 }),
		);

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.error?.code).toBe("HOST_UNREACHABLE");
	});

	it("classifies non-Error rejects as unknown", async () => {
		window.api.filesystem.list = vi.fn().mockRejectedValue("raw string error");

		const { result } = renderHook(() => useFileList("/tmp"));

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.error?.code).toBe("UNKNOWN");
		expect(result.current.error?.technicalDetail).toBe("raw string error");
	});

	it("refresh reloads local directory", async () => {
		const firstEntries: FileEntry[] = [
			{ name: "a.txt", fullPath: "/tmp/a.txt", isDirectory: false, size: 10, modified: "" },
		];
		const refreshedEntries: FileEntry[] = [
			{ name: "a.txt", fullPath: "/tmp/a.txt", isDirectory: false, size: 10, modified: "" },
			{ name: "b.txt", fullPath: "/tmp/b.txt", isDirectory: false, size: 20, modified: "" },
		];
		const listMock = vi
			.fn()
			.mockResolvedValueOnce(firstEntries)
			.mockResolvedValueOnce(refreshedEntries);
		window.api.filesystem.list = listMock;

		const { result } = renderHook(() => useFileList("/tmp"));

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

	it("refresh reloads remote directory", async () => {
		const firstEntries: FileEntry[] = [
			{ name: "x.txt", fullPath: "/tmp/x.txt", isDirectory: false, size: 100, modified: "" },
		];
		const refreshedEntries: FileEntry[] = [
			{ name: "x.txt", fullPath: "/tmp/x.txt", isDirectory: false, size: 100, modified: "" },
			{ name: "y.txt", fullPath: "/tmp/y.txt", isDirectory: false, size: 200, modified: "" },
		];
		const remoteMock = vi
			.fn()
			.mockResolvedValueOnce(firstEntries)
			.mockResolvedValueOnce(refreshedEntries);
		window.api.filesystem.remoteList = remoteMock;

		const { result } = renderHook(() =>
			useFileList("/tmp", { type: "remote", connectionId: 2 }),
		);

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
		expect(remoteMock).toHaveBeenCalledTimes(2);
	});

	it("switches from local to remote when type changes", async () => {
		const localEntries: FileEntry[] = [
			{ name: "docs", fullPath: "/data/docs", isDirectory: true, size: 0, modified: "" },
		];
		const remoteEntries: FileEntry[] = [
			{ name: "server-files", fullPath: "/data/server-files", isDirectory: true, size: 0, modified: "" },
		];
		window.api.filesystem.list = vi.fn().mockResolvedValue(localEntries);
		window.api.filesystem.remoteList = vi.fn().mockResolvedValue(remoteEntries);

		type Opts = NonNullable<Parameters<typeof useFileList>[1]>;
		const { result, rerender } = renderHook(
			({ opts }: { opts: Opts }) => useFileList("/data", opts),
			{ initialProps: { opts: {} } },
		);

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});
		expect(result.current.entries).toEqual(localEntries);

		rerender({ opts: { type: "remote", connectionId: 3 } });

		await waitFor(() => {
			expect(result.current.entries).toEqual(remoteEntries);
		});
	});
});
