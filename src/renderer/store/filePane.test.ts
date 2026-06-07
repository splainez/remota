import { createMockApi } from "@renderer/test/setup";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useFilePaneStore } from "./filePane";

function createApi(overrides: { getAll?: ReturnType<typeof vi.fn>; set?: ReturnType<typeof vi.fn> } = {}) {
	const getAll = overrides.getAll ?? vi.fn().mockResolvedValue({});
	const set = overrides.set ?? vi.fn().mockResolvedValue(undefined);
	vi.stubGlobal(
		"api",
		createMockApi({
			filePaneSize: {
				getAll: getAll as unknown as () => Promise<Record<number, { localSize: number }>>,
				set: set as unknown as (connectionId: number, update: { localSize: number }) => Promise<void>,
			},
		}),
	);
	return { getAll, set };
}

describe("useFilePaneStore", () => {
	beforeEach(() => {
		useFilePaneStore.setState({ sizes: {}, loaded: false });
		vi.clearAllMocks();
	});

	it("returns 50 by default for unknown connections", () => {
		expect(useFilePaneStore.getState().getLocalSize(1)).toBe(50);
	});

	it("load() populates sizes from IPC", async () => {
		const { getAll } = createApi({
			getAll: vi.fn().mockResolvedValue({ 1: { localSize: 70 }, 2: { localSize: 30 } }),
		});
		await act(async () => {
			await useFilePaneStore.getState().load();
		});
		expect(getAll).toHaveBeenCalledOnce();
		expect(useFilePaneStore.getState().getLocalSize(1)).toBe(70);
		expect(useFilePaneStore.getState().getLocalSize(2)).toBe(30);
		expect(useFilePaneStore.getState().loaded).toBe(true);
	});

	it("load() swallows IPC errors but flips loaded to true", async () => {
		createApi({ getAll: vi.fn().mockRejectedValue(new Error("boom")) });
		await act(async () => {
			await useFilePaneStore.getState().load();
		});
		expect(useFilePaneStore.getState().loaded).toBe(true);
	});

	it("setLocalSize clamps values to [10, 90] and persists", () => {
		const { set } = createApi();
		act(() => {
			useFilePaneStore.getState().setLocalSize(5, 95);
		});
		expect(useFilePaneStore.getState().getLocalSize(5)).toBe(90);
		expect(set).toHaveBeenCalledWith(5, { localSize: 90 });

		act(() => {
			useFilePaneStore.getState().setLocalSize(5, 5);
		});
		expect(useFilePaneStore.getState().getLocalSize(5)).toBe(10);
		expect(set).toHaveBeenCalledWith(5, { localSize: 10 });
	});

	it("setLocalSize stores value within range", () => {
		const { set } = createApi();
		act(() => {
			useFilePaneStore.getState().setLocalSize(3, 60);
		});
		expect(useFilePaneStore.getState().getLocalSize(3)).toBe(60);
		expect(set).toHaveBeenCalledWith(3, { localSize: 60 });
	});

	it("reset() clears state", () => {
		useFilePaneStore.setState({ sizes: { 1: 70 }, loaded: true });
		useFilePaneStore.getState().reset();
		expect(useFilePaneStore.getState().sizes).toEqual({});
		expect(useFilePaneStore.getState().loaded).toBe(false);
		expect(useFilePaneStore.getState().getLocalSize(1)).toBe(50);
	});

	it("load() is a no-op when already loaded (StrictMode guard)", async () => {
		const { getAll } = createApi({
			getAll: vi.fn().mockResolvedValue({ 1: { localSize: 70 } }),
		});
		await act(async () => {
			await useFilePaneStore.getState().load();
		});
		expect(getAll).toHaveBeenCalledOnce();

		act(() => {
			useFilePaneStore.getState().setLocalSize(1, 40);
		});
		expect(useFilePaneStore.getState().getLocalSize(1)).toBe(40);

		await act(async () => {
			await useFilePaneStore.getState().load();
		});
		expect(getAll).toHaveBeenCalledOnce();
		expect(useFilePaneStore.getState().getLocalSize(1)).toBe(40);
	});
});
