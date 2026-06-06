import { useSettingsStore } from "@renderer/store/settings";
import { useTransferStore } from "@renderer/store/transfer";
import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTransferAutoClear } from "./useTransferAutoClear";

function addItem(id: string, status: "queued" | "active" | "completed" | "failed" | "cancelled") {
	useTransferStore.getState().handleProgress({
		jobId: "job-1",
		id,
		connectionId: 1,
		name: `${id}.txt`,
		source: `/remote/${id}.txt`,
		target: `C:\\local\\${id}.txt`,
		direction: "download",
		totalBytes: 100,
		transferredBytes: status === "completed" ? 100 : 0,
		status,
		...(status === "failed" ? { error: "test error" } : {}),
	});
}

describe("useTransferAutoClear", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		useTransferStore.setState({ byConnection: {} });
		useSettingsStore.setState({ retentionMs: undefined });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("does not remove items when retentionMs is undefined", () => {
		addItem("file-1", "completed");

		renderHook(
			() => {
				useTransferAutoClear(1);
			},
			{ wrapper: I18nWrapper },
		);

		vi.advanceTimersByTime(60_000);

		const items = useTransferStore.getState().byConnection[1] ?? [];
		expect(items).toHaveLength(1);
		expect(items[0].id).toBe("file-1");
	});

	it("removes completed items after retention period", () => {
		useSettingsStore.setState({ retentionMs: 5_000 });
		addItem("file-1", "completed");

		renderHook(
			() => {
				useTransferAutoClear(1);
			},
			{ wrapper: I18nWrapper },
		);

		vi.advanceTimersByTime(4_999);
		expect(useTransferStore.getState().byConnection[1] ?? []).toHaveLength(1);

		vi.advanceTimersByTime(1);
		expect(useTransferStore.getState().byConnection[1] ?? []).toHaveLength(0);
	});

	it("removes failed items after retention period", () => {
		useSettingsStore.setState({ retentionMs: 5_000 });
		addItem("file-1", "failed");

		renderHook(
			() => {
				useTransferAutoClear(1);
			},
			{ wrapper: I18nWrapper },
		);

		vi.advanceTimersByTime(5_000);
		expect(useTransferStore.getState().byConnection[1] ?? []).toHaveLength(0);
	});

	it("removes cancelled items after retention period", () => {
		useSettingsStore.setState({ retentionMs: 5_000 });
		addItem("file-1", "cancelled");

		renderHook(
			() => {
				useTransferAutoClear(1);
			},
			{ wrapper: I18nWrapper },
		);

		vi.advanceTimersByTime(5_000);
		expect(useTransferStore.getState().byConnection[1] ?? []).toHaveLength(0);
	});

	it("does not remove active or queued items", () => {
		useSettingsStore.setState({ retentionMs: 5_000 });
		addItem("file-1", "active");
		addItem("file-2", "queued");

		renderHook(
			() => {
				useTransferAutoClear(1);
			},
			{ wrapper: I18nWrapper },
		);

		vi.advanceTimersByTime(60_000);
		const items = useTransferStore.getState().byConnection[1] ?? [];
		expect(items).toHaveLength(2);
	});

	it("clears timers on unmount", () => {
		useSettingsStore.setState({ retentionMs: 5_000 });
		addItem("file-1", "completed");

		const { unmount } = renderHook(
			() => {
				useTransferAutoClear(1);
			},
			{ wrapper: I18nWrapper },
		);

		unmount();
		vi.advanceTimersByTime(60_000);

		const items = useTransferStore.getState().byConnection[1] ?? [];
		expect(items).toHaveLength(1);
	});

	it("removes items for the correct connection only", () => {
		useSettingsStore.setState({ retentionMs: 5_000 });
		useTransferStore.getState().handleProgress({
			jobId: "job-1",
			id: "conn1-file",
			connectionId: 1,
			name: "conn1-file.txt",
			source: "/remote/conn1-file.txt",
			target: "C:\\local\\conn1-file.txt",
			direction: "download",
			totalBytes: 100,
			transferredBytes: 100,
			status: "completed",
		});
		useTransferStore.getState().handleProgress({
			jobId: "job-2",
			id: "conn2-file",
			connectionId: 2,
			name: "conn2-file.txt",
			source: "/remote/conn2-file.txt",
			target: "C:\\local\\conn2-file.txt",
			direction: "download",
			totalBytes: 100,
			transferredBytes: 100,
			status: "completed",
		});

		renderHook(
			() => {
				useTransferAutoClear(1);
			},
			{ wrapper: I18nWrapper },
		);

		vi.advanceTimersByTime(5_000);

		const conn1Items = useTransferStore.getState().byConnection[1] ?? [];
		const conn2Items = useTransferStore.getState().byConnection[2] ?? [];
		expect(conn1Items).toHaveLength(0);
		expect(conn2Items).toHaveLength(1);
	});
});
