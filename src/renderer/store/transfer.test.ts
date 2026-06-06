import type { TransferProgressEvent } from "@shared/transfer-types";
import { afterEach, describe, expect, it } from "vitest";

import { useTransferStore } from "./transfer";

function makeEvent(overrides: Partial<TransferProgressEvent> & { id: string }): TransferProgressEvent {
	return {
		jobId: "job-1",
		connectionId: 1,
		name: overrides.id,
		source: `/${overrides.id}`,
		target: `/${overrides.id}`,
		direction: "download",
		totalBytes: 1024,
		transferredBytes: 0,
		status: "queued",
		...overrides,
	};
}

afterEach(() => {
	useTransferStore.getState().reset();
});

describe("handleProgress", () => {
	it("adds a new item on queued status", () => {
		useTransferStore.getState().handleProgress(makeEvent({ id: "f1" }));

		const items = useTransferStore.getState().byConnection[1] ?? [];
		expect(items).toHaveLength(1);
		expect(items[0].id).toBe("f1");
		expect(items[0].status).toBe("queued");
	});

	it("updates item status to cancelled when cancelled event arrives", () => {
		useTransferStore.getState().handleProgress(makeEvent({ id: "f1", status: "queued" }));
		useTransferStore.getState().handleProgress(makeEvent({ id: "f1", status: "cancelled", transferredBytes: 0 }));

		const items = useTransferStore.getState().byConnection[1] ?? [];
		expect(items).toHaveLength(1);
		expect(items[0].status).toBe("cancelled");
	});

	it("cancelled status excludes item from pendingCount", () => {
		useTransferStore.getState().handleProgress(makeEvent({ id: "f1", status: "queued" }));
		expect(useTransferStore.getState().pendingCount(1)).toBe(1);

		useTransferStore.getState().handleProgress(makeEvent({ id: "f1", status: "cancelled", transferredBytes: 0 }));
		expect(useTransferStore.getState().pendingCount(1)).toBe(0);
	});

	it("does not affect other items when one is cancelled", () => {
		useTransferStore.getState().handleProgress(makeEvent({ id: "f1", status: "queued" }));
		useTransferStore.getState().handleProgress(makeEvent({ id: "f2", status: "queued" }));
		expect(useTransferStore.getState().pendingCount(1)).toBe(2);

		useTransferStore.getState().handleProgress(makeEvent({ id: "f1", status: "cancelled", transferredBytes: 0 }));

		const items = useTransferStore.getState().byConnection[1] ?? [];
		expect(items).toHaveLength(2);
		expect(items.find((i) => i.id === "f1")?.status).toBe("cancelled");
		expect(items.find((i) => i.id === "f2")?.status).toBe("queued");
		expect(useTransferStore.getState().pendingCount(1)).toBe(1);
	});
});
