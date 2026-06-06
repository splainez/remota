import { formatSpeed } from "@renderer/lib/file-utils";
import { useTransferStore } from "@renderer/store/transfer";
import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTransferSpeed } from "./useTransferSpeed";

function pushProgress(id: string, transferredBytes: number, status: "active" | "completed" | "queued" = "active") {
	useTransferStore.getState().handleProgress({
		jobId: "job-1",
		id,
		connectionId: 1,
		name: `${id}.txt`,
		source: `/remote/${id}.txt`,
		target: `C:\\local\\${id}.txt`,
		direction: "download",
		totalBytes: 1_000_000,
		transferredBytes,
		status,
	});
}

describe("useTransferSpeed", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		useTransferStore.setState({ byConnection: {} });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns 0 for items with no progress", () => {
		pushProgress("file-1", 0);

		const { result } = renderHook(() => useTransferSpeed(1), { wrapper: I18nWrapper });
		expect(result.current("file-1")).toBe(0);
	});

	it("returns 0 with a single sample after mount", () => {
		pushProgress("file-1", 1000);

		const { result } = renderHook(() => useTransferSpeed(1), { wrapper: I18nWrapper });
		expect(result.current("file-1")).toBe(0);
	});

	it("computes speed when bytes increase between renders", () => {
		pushProgress("file-1", 0);

		const { result } = renderHook(() => useTransferSpeed(1), { wrapper: I18nWrapper });

		vi.advanceTimersByTime(1000);
		act(() => {
			pushProgress("file-1", 500_000);
		});

		expect(result.current("file-1")).toBeCloseTo(500_000, 0);
	});

	it("computes speed from multiple increments", () => {
		pushProgress("file-1", 0);

		const { result } = renderHook(() => useTransferSpeed(1), { wrapper: I18nWrapper });

		vi.advanceTimersByTime(500);
		act(() => {
			pushProgress("file-1", 250_000);
		});

		vi.advanceTimersByTime(500);
		act(() => {
			pushProgress("file-1", 500_000);
		});

		expect(result.current("file-1")).toBeCloseTo(500_000, 0);
	});

	it("returns 0 for non-active items", () => {
		pushProgress("file-1", 0, "completed");

		const { result } = renderHook(() => useTransferSpeed(1), { wrapper: I18nWrapper });

		vi.advanceTimersByTime(1000);
		act(() => {
			pushProgress("file-1", 500_000, "completed");
		});

		expect(result.current("file-1")).toBe(0);
	});

	it("returns 0 for unknown item id", () => {
		const { result } = renderHook(() => useTransferSpeed(1), { wrapper: I18nWrapper });
		expect(result.current("unknown")).toBe(0);
	});

	it("clears speed data on unmount", () => {
		pushProgress("file-1", 0);

		const { result, unmount } = renderHook(() => useTransferSpeed(1), { wrapper: I18nWrapper });

		vi.advanceTimersByTime(1000);
		act(() => {
			pushProgress("file-1", 500_000);
		});
		expect(result.current("file-1")).toBeGreaterThan(0);

		unmount();

		const { result: result2 } = renderHook(() => useTransferSpeed(1), { wrapper: I18nWrapper });
		expect(result2.current("file-1")).toBe(0);
	});

	it("removes speed for items no longer in store", () => {
		pushProgress("file-1", 0);

		const { result } = renderHook(() => useTransferSpeed(1), { wrapper: I18nWrapper });

		vi.advanceTimersByTime(1000);
		act(() => {
			pushProgress("file-1", 500_000);
		});
		expect(result.current("file-1")).toBeGreaterThan(0);

		act(() => {
			useTransferStore.setState({ byConnection: {} });
		});
		expect(result.current("file-1")).toBe(0);
	});
});

describe("formatSpeed", () => {
	it("returns empty string for 0", () => {
		expect(formatSpeed(0)).toBe("");
	});

	it("returns empty string for negative", () => {
		expect(formatSpeed(-100)).toBe("");
	});

	it("formats bytes per second", () => {
		expect(formatSpeed(500)).toBe("500 B/s");
	});

	it("formats kilobytes per second", () => {
		expect(formatSpeed(2048)).toBe("2.0 KB/s");
	});

	it("formats megabytes per second", () => {
		expect(formatSpeed(5_242_880)).toBe("5.0 MB/s");
	});

	it("formats gigabytes per second", () => {
		expect(formatSpeed(2_147_483_648)).toBe("2.0 GB/s");
	});
});
