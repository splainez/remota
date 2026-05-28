import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useContextMenu } from "./useContextMenu";

describe("useContextMenu", () => {
	it("starts with menu null", () => {
		const { result } = renderHook(() => useContextMenu());
		expect(result.current.menu).toBeNull();
	});

	it("opens menu at mouse coordinates with data", () => {
		const { result } = renderHook(() => useContextMenu<number>());
		act(() => {
			result.current.open(
				{ clientX: 300, clientY: 400, preventDefault: vi.fn() } as React.MouseEvent,
				42,
			);
		});
		expect(result.current.menu).toEqual({ x: 300, y: 400, data: 42 });
	});

	it("calls preventDefault on open", () => {
		const { result } = renderHook(() => useContextMenu());
		const p = vi.fn();
		act(() => {
			result.current.open(
				{ clientX: 0, clientY: 0, preventDefault: p } as React.MouseEvent,
				undefined as unknown as void,
			);
		});
		expect(p).toHaveBeenCalled();
	});

	it("closes menu on close call", () => {
		const { result } = renderHook(() => useContextMenu());
		act(() => {
			result.current.open(
				{ clientX: 100, clientY: 200, preventDefault: vi.fn() } as React.MouseEvent,
				undefined as unknown as void,
			);
		});
		expect(result.current.menu).not.toBeNull();
		act(() => {
			result.current.close();
		});
		expect(result.current.menu).toBeNull();
	});

	it("closes menu on document click when menu is open", () => {
		const { result } = renderHook(() => useContextMenu());
		act(() => {
			result.current.open(
				{ clientX: 100, clientY: 200, preventDefault: vi.fn() } as React.MouseEvent,
				undefined as unknown as void,
			);
		});
		expect(result.current.menu).not.toBeNull();

		act(() => {
			document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		});

		act(() => {
			result.current.close();
		});
		expect(result.current.menu).toBeNull();
	});
});
