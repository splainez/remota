import { createMockApi } from "@renderer/test/setup";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTransferPanelStore } from "./transferPanel";

function createApi(overrides: { getAll?: ReturnType<typeof vi.fn>; set?: ReturnType<typeof vi.fn> } = {}) {
	const getAll = overrides.getAll ?? vi.fn().mockResolvedValue({});
	const set = overrides.set ?? vi.fn().mockResolvedValue(undefined);
	vi.stubGlobal(
		"api",
		createMockApi({
			transferPanel: {
				getAll: getAll as unknown as () => Promise<Record<number, { visible: boolean }>>,
				set: set as unknown as (connectionId: number, update: { visible: boolean }) => Promise<void>,
			},
		}),
	);
	return { getAll, set };
}

describe("useTransferPanelStore", () => {
	beforeEach(() => {
		useTransferPanelStore.setState({ visibility: {}, loaded: false });
		vi.clearAllMocks();
	});

	it("is hidden by default for unknown connections", () => {
		expect(useTransferPanelStore.getState().isVisible(1)).toBe(false);
	});

	it("load() populates visibility from IPC", async () => {
		const { getAll } = createApi({
			getAll: vi.fn().mockResolvedValue({ 1: { visible: true }, 2: { visible: false } }),
		});
		await act(async () => {
			await useTransferPanelStore.getState().load();
		});
		expect(getAll).toHaveBeenCalledOnce();
		expect(useTransferPanelStore.getState().isVisible(1)).toBe(true);
		expect(useTransferPanelStore.getState().isVisible(2)).toBe(false);
		expect(useTransferPanelStore.getState().isVisible(99)).toBe(false);
		expect(useTransferPanelStore.getState().loaded).toBe(true);
	});

	it("load() swallows IPC errors but flips loaded to true", async () => {
		createApi({ getAll: vi.fn().mockRejectedValue(new Error("boom")) });
		await act(async () => {
			await useTransferPanelStore.getState().load();
		});
		expect(useTransferPanelStore.getState().loaded).toBe(true);
	});

	it("setVisible updates local state and persists", () => {
		const { set } = createApi();
		act(() => {
			useTransferPanelStore.getState().setVisible(5, true);
		});
		expect(useTransferPanelStore.getState().isVisible(5)).toBe(true);
		expect(set).toHaveBeenCalledWith(5, { visible: true });
	});

	it("toggle flips current visibility", () => {
		createApi();
		act(() => {
			useTransferPanelStore.getState().setVisible(7, false);
		});
		act(() => {
			useTransferPanelStore.getState().toggle(7);
		});
		expect(useTransferPanelStore.getState().isVisible(7)).toBe(true);
		act(() => {
			useTransferPanelStore.getState().toggle(7);
		});
		expect(useTransferPanelStore.getState().isVisible(7)).toBe(false);
	});

	it("notifyTransferStarted opens the panel only if currently hidden", () => {
		const { set } = createApi();
		act(() => {
			useTransferPanelStore.getState().notifyTransferStarted(3);
		});
		expect(useTransferPanelStore.getState().isVisible(3)).toBe(true);
		expect(set).toHaveBeenCalledWith(3, { visible: true });

		set.mockClear();
		act(() => {
			useTransferPanelStore.getState().notifyTransferStarted(3);
		});
		expect(set).not.toHaveBeenCalled();
	});

	it("reset() clears state", () => {
		useTransferPanelStore.setState({ visibility: { 1: true }, loaded: true });
		useTransferPanelStore.getState().reset();
		expect(useTransferPanelStore.getState().visibility).toEqual({});
		expect(useTransferPanelStore.getState().loaded).toBe(false);
	});

	it("load() is a no-op when already loaded (StrictMode guard)", async () => {
		const { getAll } = createApi({
			getAll: vi.fn().mockResolvedValue({ 1: { visible: true } }),
		});
		await act(async () => {
			await useTransferPanelStore.getState().load();
		});
		expect(getAll).toHaveBeenCalledOnce();

		// Simulate user toggle after first load.
		act(() => {
			useTransferPanelStore.getState().setVisible(1, false);
		});
		expect(useTransferPanelStore.getState().isVisible(1)).toBe(false);

		// Second load() should not re-fetch and must not clobber the toggle.
		await act(async () => {
			await useTransferPanelStore.getState().load();
		});
		expect(getAll).toHaveBeenCalledOnce();
		expect(useTransferPanelStore.getState().isVisible(1)).toBe(false);
	});
});
