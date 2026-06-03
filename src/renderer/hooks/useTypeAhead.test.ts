import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTypeAhead } from "./useTypeAhead";
import type { FileEntry } from "@shared/types";

function makeEntry(name: string): FileEntry {
	return { name, fullPath: `/${name}`, isDirectory: false, size: 100, modified: "2025-01-01T00:00:00Z" };
}

function makeKeydownEvent(key: string): React.KeyboardEvent {
	return {
		key,
		ctrlKey: false,
		altKey: false,
		metaKey: false,
		preventDefault: vi.fn(),
	} as unknown as React.KeyboardEvent;
}

function createScrollRef(): React.RefObject<HTMLDivElement | null> {
	return { current: document.createElement("div") };
}

describe("useTypeAhead", () => {
	const entries = [
		makeEntry("apple.txt"),
		makeEntry("apricot.txt"),
		makeEntry("banana.txt"),
		makeEntry("blueberry.txt"),
		makeEntry("cherry.txt"),
	];

	beforeEach(() => {
		vi.useFakeTimers();
	});

	it("jumps to first matching entry on keypress", () => {
		const ref = createScrollRef();
		const { result } = renderHook(() => useTypeAhead(entries, ref));
		act(() => {
			result.current.handleKeyDown(makeKeydownEvent("a"));
		});
		expect(result.current.typeAheadName).toBe("apple.txt");
	});

	it("jumps to matching entry case-insensitively", () => {
		const ref = createScrollRef();
		const { result } = renderHook(() => useTypeAhead(entries, ref));
		act(() => {
			result.current.handleKeyDown(makeKeydownEvent("B"));
		});
		expect(result.current.typeAheadName).toBe("banana.txt");
	});

	it("cycles to next match on repeated keypress within threshold", () => {
		const ref = createScrollRef();
		const { result } = renderHook(() => useTypeAhead(entries, ref));
		act(() => {
			result.current.handleKeyDown(makeKeydownEvent("a"));
		});
		expect(result.current.typeAheadName).toBe("apple.txt");

		act(() => {
			vi.advanceTimersByTime(100);
		});
		act(() => {
			result.current.handleKeyDown(makeKeydownEvent("a"));
		});
		expect(result.current.typeAheadName).toBe("apricot.txt");
	});

	it("cycles back to first after last match", () => {
		const ref = createScrollRef();
		const { result } = renderHook(() => useTypeAhead(entries, ref));
		act(() => {
			result.current.handleKeyDown(makeKeydownEvent("a"));
		});
		expect(result.current.typeAheadName).toBe("apple.txt");

		act(() => {
			vi.advanceTimersByTime(100);
		});
		act(() => {
			result.current.handleKeyDown(makeKeydownEvent("a"));
		});
		expect(result.current.typeAheadName).toBe("apricot.txt");

		act(() => {
			vi.advanceTimersByTime(100);
		});
		act(() => {
			result.current.handleKeyDown(makeKeydownEvent("a"));
		});
		expect(result.current.typeAheadName).toBe("apple.txt");
	});

	it("does nothing when no entries match", () => {
		const ref = createScrollRef();
		const { result } = renderHook(() => useTypeAhead(entries, ref));
		act(() => {
			result.current.handleKeyDown(makeKeydownEvent("z"));
		});
		expect(result.current.typeAheadName).toBeNull();
	});

	it("ignores modifier keys", () => {
		const ref = createScrollRef();
		const { result } = renderHook(() => useTypeAhead(entries, ref));
		const ctrlEvent = {
			key: "a",
			ctrlKey: true,
			altKey: false,
			metaKey: false,
			preventDefault: vi.fn(),
		} as unknown as React.KeyboardEvent;
		act(() => {
			result.current.handleKeyDown(ctrlEvent);
		});
		expect(result.current.typeAheadName).toBeNull();
	});

	it("ignores multi-character keys like Shift", () => {
		const ref = createScrollRef();
		const { result } = renderHook(() => useTypeAhead(entries, ref));
		const shiftEvent = {
			key: "Shift",
			ctrlKey: false,
			altKey: false,
			metaKey: false,
			preventDefault: vi.fn(),
		} as unknown as React.KeyboardEvent;
		act(() => {
			result.current.handleKeyDown(shiftEvent);
		});
		expect(result.current.typeAheadName).toBeNull();
	});

	it("resets cycle after threshold expires", () => {
		const ref = createScrollRef();
		const { result } = renderHook(() => useTypeAhead(entries, ref));
		act(() => {
			result.current.handleKeyDown(makeKeydownEvent("a"));
		});
		expect(result.current.typeAheadName).toBe("apple.txt");

		act(() => {
			vi.advanceTimersByTime(600);
		});
		act(() => {
			result.current.handleKeyDown(makeKeydownEvent("a"));
		});
		expect(result.current.typeAheadName).toBe("apple.txt");
	});

	it("clearTypeAhead resets state", () => {
		const ref = createScrollRef();
		const { result } = renderHook(() => useTypeAhead(entries, ref));
		act(() => {
			result.current.handleKeyDown(makeKeydownEvent("a"));
		});
		expect(result.current.typeAheadName).toBe("apple.txt");

		act(() => {
			result.current.clearTypeAhead();
		});
		expect(result.current.typeAheadName).toBeNull();
	});

	it("works with empty entries list", () => {
		const ref = createScrollRef();
		const { result } = renderHook(() => useTypeAhead([], ref));
		act(() => {
			result.current.handleKeyDown(makeKeydownEvent("a"));
		});
		expect(result.current.typeAheadName).toBeNull();
	});
});
