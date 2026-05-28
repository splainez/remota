import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

describe("useFileIcon", () => {
	beforeEach(() => {
		vi.resetModules();
		window.api.filesystem.getIcon = vi.fn().mockResolvedValue(null);
	});

	it("returns null icon when filePath is undefined", async () => {
		const { useFileIcon: useIcon } = await import("./useFileIcon");
		const { result } = renderHook(() => useIcon(undefined));
		expect(result.current.icon).toBeNull();
	});

	it("returns null icon initially while fetching", async () => {
		const { useFileIcon: useIcon } = await import("./useFileIcon");
		window.api.filesystem.getIcon = vi.fn().mockImplementation(() => new Promise<null>(() => undefined));
		const { result } = renderHook(() => useIcon("/tmp/a.txt"));
		expect(result.current.icon).toBeNull();
	});

	it("sets icon when getIcon resolves with a data URL", async () => {
		const { useFileIcon: useIcon } = await import("./useFileIcon");
		const dataUrl = "data:image/png;base64,abc123";
		window.api.filesystem.getIcon = vi.fn().mockResolvedValue(dataUrl);
		const { result } = renderHook(() => useIcon("/tmp/b.txt"));
		await waitFor(() => {
			expect(result.current.icon).toBe(dataUrl);
		});
	});

	it("stays null when getIcon resolves null", async () => {
		const { useFileIcon: useIcon } = await import("./useFileIcon");
		window.api.filesystem.getIcon = vi.fn().mockResolvedValue(null);
		const { result } = renderHook(() => useIcon("/tmp/c.txt"));
		await waitFor(() => {
			expect(window.api.filesystem.getIcon).toHaveBeenCalledWith("/tmp/c.txt");
		});
		expect(result.current.icon).toBeNull();
	});

	it("calls getIcon only once per filePath (caching)", async () => {
		const { useFileIcon: useIcon } = await import("./useFileIcon");
		const dataUrl = "data:image/png;base64,cached";
		const getIcon = vi.fn().mockResolvedValue(dataUrl);
		window.api.filesystem.getIcon = getIcon;

		const { result, rerender } = renderHook(({ path }) => useIcon(path), { initialProps: { path: "/tmp/d.txt" } });

		await waitFor(() => {
			expect(result.current.icon).toBe(dataUrl);
		});

		rerender({ path: "/tmp/d.txt" });

		expect(getIcon).toHaveBeenCalledTimes(1);
		expect(result.current.icon).toBe(dataUrl);
	});

	it("refetches when filePath changes", async () => {
		const { useFileIcon: useIcon } = await import("./useFileIcon");
		const getIcon = vi.fn().mockImplementation((path: string) => Promise.resolve(`icon:${path}`));
		window.api.filesystem.getIcon = getIcon;

		const { result, rerender } = renderHook(({ path }) => useIcon(path), { initialProps: { path: "/tmp/e.txt" } });

		await waitFor(() => {
			expect(result.current.icon).toBe("icon:/tmp/e.txt");
		});

		rerender({ path: "/tmp/f.txt" });

		await waitFor(() => {
			expect(result.current.icon).toBe("icon:/tmp/f.txt");
		});

		expect(getIcon).toHaveBeenCalledTimes(2);
	});
});
