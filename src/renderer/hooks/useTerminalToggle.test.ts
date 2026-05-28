import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTerminalToggle } from "./useTerminalToggle";

describe("useTerminalToggle", () => {
	it("starts with visible false", () => {
		const { result } = renderHook(() => useTerminalToggle());
		expect(result.current.visible).toBe(false);
	});

	it("toggles visible on toggle call", () => {
		const { result } = renderHook(() => useTerminalToggle());
		act(() => {
			result.current.toggle();
		});
		expect(result.current.visible).toBe(true);
		act(() => {
			result.current.toggle();
		});
		expect(result.current.visible).toBe(false);
	});

	it("toggles on Ctrl+` keydown", () => {
		const { result } = renderHook(() => useTerminalToggle());
		act(() => {
			result.current.handleKeyDown({
				ctrlKey: true,
				key: "`",
				preventDefault: () => {},
			} as React.KeyboardEvent);
		});
		expect(result.current.visible).toBe(true);

		act(() => {
			result.current.handleKeyDown({
				ctrlKey: true,
				key: "`",
				preventDefault: () => {},
			} as React.KeyboardEvent);
		});
		expect(result.current.visible).toBe(false);
	});

	it("does not toggle on other key combinations", () => {
		const { result } = renderHook(() => useTerminalToggle());
		act(() => {
			result.current.handleKeyDown({
				ctrlKey: false,
				key: "`",
				preventDefault: () => {},
			} as React.KeyboardEvent);
		});
		expect(result.current.visible).toBe(false);
	});

	it("does not toggle on Ctrl+other key", () => {
		const { result } = renderHook(() => useTerminalToggle());
		act(() => {
			result.current.handleKeyDown({
				ctrlKey: true,
				key: "t",
				preventDefault: () => {},
			} as React.KeyboardEvent);
		});
		expect(result.current.visible).toBe(false);
	});
});
