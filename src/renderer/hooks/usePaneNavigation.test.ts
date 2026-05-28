import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePaneNavigation } from "./usePaneNavigation";

vi.mock("../store/navigation", () => ({
	useNavigationStore: vi.fn(),
}));

const makeStoreMock = () => {
	const push = vi.fn();
	const goBackFn = vi.fn<() => string | null>(() => null);
	const goForwardFn = vi.fn<() => string | null>(() => null);

	return { push, goBack: goBackFn, goForward: goForwardFn };
};

describe("usePaneNavigation", () => {
	let storeMock: ReturnType<typeof makeStoreMock>;

	beforeEach(async () => {
		vi.clearAllMocks();
		storeMock = makeStoreMock();
		const { useNavigationStore } = await import("../store/navigation");
		vi.mocked(useNavigationStore).mockImplementation((selector: unknown) => {
			const state = {
				push: storeMock.push,
				goBack: storeMock.goBack,
				goForward: storeMock.goForward,
				canGoBack: () => false,
				canGoForward: () => false,
				clear: vi.fn(),
			};
			if (typeof selector === "function") {
				return (selector as (s: typeof state) => unknown)(state);
			}
			return state;
		});
	});

	it("sets initial path on mount", () => {
		renderHook(() => usePaneNavigation("local", "/home/user"));
		expect(storeMock.push).toHaveBeenCalledWith("local", "/home/user");
	});

	it("navigates to a new path", () => {
		const { result } = renderHook(() => usePaneNavigation("local", "/"));
		act(() => {
			result.current.navigateTo("/home");
		});
		expect(storeMock.push).toHaveBeenCalledWith("local", "/home");
		expect(result.current.currentPath).toBe("/home");
	});

	it("navigates up using parentPath", () => {
		const { result } = renderHook(() => usePaneNavigation("local", "/home/user/docs"));

		act(() => {
			result.current.handleNavigateUp();
		});
		expect(result.current.currentPath).toBe("/home/user");
	});

	it("does not navigate up when at root", () => {
		const { result } = renderHook(() => usePaneNavigation("local", "/"));

		act(() => {
			result.current.handleNavigateUp();
		});
		expect(result.current.currentPath).toBe("/");
	});

	it("enters directory by joining path", () => {
		const { result } = renderHook(() => usePaneNavigation("local", "/home"));

		act(() => {
			result.current.handleEnterDirectory("projects");
		});
		expect(result.current.currentPath).toBe("/home/projects");
	});

	it("goes back in navigation history", () => {
		storeMock.goBack.mockReturnValue("/previous");
		const { result } = renderHook(() => usePaneNavigation("local", "/"));
		act(() => {
			result.current.handleGoBack();
		});
		expect(result.current.currentPath).toBe("/previous");
	});

	it("does not change path when goBack returns null", () => {
		storeMock.goBack.mockReturnValue(null);
		const { result } = renderHook(() => usePaneNavigation("local", "/home"));
		act(() => {
			result.current.handleGoBack();
		});
		expect(result.current.currentPath).toBe("/home");
	});

	it("goes forward in navigation history", () => {
		storeMock.goForward.mockReturnValue("/next");
		const { result } = renderHook(() => usePaneNavigation("local", "/"));
		act(() => {
			result.current.handleGoForward();
		});
		expect(result.current.currentPath).toBe("/next");
	});

	it("handles mouse button 3 as back navigation", () => {
		storeMock.goBack.mockReturnValue("/back");
		const { result } = renderHook(() => usePaneNavigation("local", "/"));
		act(() => {
			result.current.handleMouseDown({ button: 3, preventDefault: vi.fn() } as unknown as React.MouseEvent);
		});
		expect(result.current.currentPath).toBe("/back");
	});

	it("handles mouse button 4 as forward navigation", () => {
		storeMock.goForward.mockReturnValue("/forward");
		const { result } = renderHook(() => usePaneNavigation("local", "/"));
		act(() => {
			result.current.handleMouseDown({ button: 4, preventDefault: vi.fn() } as unknown as React.MouseEvent);
		});
		expect(result.current.currentPath).toBe("/forward");
	});

	it("ignores other mouse buttons", () => {
		const { result } = renderHook(() => usePaneNavigation("local", "/home"));
		act(() => {
			result.current.handleMouseDown({ button: 0, preventDefault: vi.fn() } as unknown as React.MouseEvent);
		});
		expect(result.current.currentPath).toBe("/home");
	});

	it("exposes canGoBack and canGoForward from store", () => {
		const { result } = renderHook(() => usePaneNavigation("local", "/"));
		expect(result.current.canGoBack).toBe(false);
		expect(result.current.canGoForward).toBe(false);
	});
});
