import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useFilePermissions } from "./useFilePermissions";

function createMockEntry(overrides: Record<string, unknown> = {}) {
	return {
		name: "test.txt",
		fullPath: "/home/user/test.txt",
		isDirectory: false,
		size: 100,
		modified: "2024-01-01T00:00:00Z",
		mode: 0o644,
		uid: 1000,
		gid: 1000,
		ownerName: "testuser",
		groupName: "testgroup",
		...overrides,
	};
}

describe("useFilePermissions", () => {
	const mockRefresh = vi.fn().mockResolvedValue(undefined);

	beforeEach(() => {
		vi.clearAllMocks();
		window.api.filesystem.remoteListUsers = vi.fn().mockResolvedValue([
			{ name: "root", uid: 0 },
			{ name: "testuser", uid: 1000 },
		]);
		window.api.filesystem.remoteListGroups = vi.fn().mockResolvedValue([
			{ name: "root", gid: 0 },
			{ name: "testgroup", gid: 1000 },
		]);
		window.api.filesystem.remoteChmod = vi.fn().mockResolvedValue(undefined);
		window.api.filesystem.remoteChown = vi.fn().mockResolvedValue(undefined);
	});

	it("starts with dialog closed", () => {
		const { result } = renderHook(() => useFilePermissions({ connectionId: 1, refresh: mockRefresh }), {
			wrapper: I18nWrapper,
		});
		expect(result.current.open).toBe(false);
		expect(result.current.entry).toBeNull();
	});

	it("opens dialog and loads users/groups", async () => {
		const { result } = renderHook(() => useFilePermissions({ connectionId: 1, refresh: mockRefresh }), {
			wrapper: I18nWrapper,
		});
		const entry = createMockEntry();

		await act(async () => {
			await result.current.openDialog(entry);
		});

		await waitFor(() => {
			expect(result.current.open).toBe(true);
		});
		expect(result.current.entry).toEqual(entry);
		expect(result.current.users).toHaveLength(2);
		expect(result.current.groups).toHaveLength(2);
		expect(window.api.filesystem.remoteListUsers).toHaveBeenCalledWith(1);
		expect(window.api.filesystem.remoteListGroups).toHaveBeenCalledWith(1);
	});

	it("closes dialog and resets state", async () => {
		const { result } = renderHook(() => useFilePermissions({ connectionId: 1, refresh: mockRefresh }), {
			wrapper: I18nWrapper,
		});

		await act(async () => {
			await result.current.openDialog(createMockEntry());
		});

		await waitFor(() => {
			expect(result.current.open).toBe(true);
		});

		act(() => {
			result.current.closeDialog();
		});

		expect(result.current.open).toBe(false);
		expect(result.current.entry).toBeNull();
		expect(result.current.users).toHaveLength(0);
		expect(result.current.groups).toHaveLength(0);
	});

	it("applyPermissions calls chmod and chown then refreshes", async () => {
		const { result } = renderHook(() => useFilePermissions({ connectionId: 1, refresh: mockRefresh }), {
			wrapper: I18nWrapper,
		});

		await act(async () => {
			await result.current.openDialog(createMockEntry());
		});

		await waitFor(() => {
			expect(result.current.open).toBe(true);
		});

		await act(async () => {
			await result.current.applyPermissions({ mode: "755", uid: 0, gid: 0 });
		});

		expect(window.api.filesystem.remoteChmod).toHaveBeenCalledWith(1, "/home/user/test.txt", "755");
		expect(window.api.filesystem.remoteChown).toHaveBeenCalledWith(1, "/home/user/test.txt", 0, 0);
		expect(mockRefresh).toHaveBeenCalled();
		expect(result.current.open).toBe(false);
	});

	it("applyPermissions handles errors gracefully", async () => {
		window.api.filesystem.remoteChmod = vi.fn().mockRejectedValue(new Error("Permission denied"));

		const { result } = renderHook(() => useFilePermissions({ connectionId: 1, refresh: mockRefresh }), {
			wrapper: I18nWrapper,
		});

		await act(async () => {
			await result.current.openDialog(createMockEntry());
		});

		await waitFor(() => {
			expect(result.current.open).toBe(true);
		});

		await act(async () => {
			await result.current.applyPermissions({ mode: "755", uid: 0, gid: 0 });
		});

		expect(result.current.open).toBe(true);
		expect(mockRefresh).not.toHaveBeenCalled();
	});

	it("handles empty user/group lists", async () => {
		window.api.filesystem.remoteListUsers = vi.fn().mockResolvedValue([]);
		window.api.filesystem.remoteListGroups = vi.fn().mockResolvedValue([]);

		const { result } = renderHook(() => useFilePermissions({ connectionId: 1, refresh: mockRefresh }), {
			wrapper: I18nWrapper,
		});

		await act(async () => {
			await result.current.openDialog(createMockEntry());
		});

		await waitFor(() => {
			expect(result.current.open).toBe(true);
		});

		expect(result.current.users).toHaveLength(0);
		expect(result.current.groups).toHaveLength(0);
	});
});
