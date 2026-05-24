import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Breadcrumb, parsePath } from "./Breadcrumb";

beforeAll(() => {
	class ResizeObserverMock {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
});

describe("parsePath", () => {
	it("parses Unix path into segments in correct order", () => {
		const segments = parsePath("/home/user/projects");
		expect(segments).toHaveLength(4);
		expect(segments[0]).toEqual({ label: "/", path: "/" });
		expect(segments[1]).toEqual({ label: "home", path: "/home" });
		expect(segments[2]).toEqual({ label: "user", path: "/home/user" });
		expect(segments[3]).toEqual({ label: "projects", path: "/home/user/projects" });
	});

	it("parses root / as single segment", () => {
		const segments = parsePath("/");
		expect(segments).toHaveLength(1);
		expect(segments[0]).toEqual({ label: "/", path: "/" });
	});
});

describe("Breadcrumb", () => {
	const defaultProps = {
		path: "/home/user",
		onNavigate: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders segments in correct order for a Unix path", () => {
		render(<Breadcrumb {...defaultProps} />);
		const visibleButtons = screen.getAllByRole("button").filter(
			(btn) => !btn.closest('[aria-hidden="true"]'),
		);
		expect(visibleButtons).toHaveLength(3);
		expect(visibleButtons[0]).toHaveTextContent("/");
		expect(visibleButtons[1]).toHaveTextContent("home");
		expect(visibleButtons[2]).toHaveTextContent("user");
	});

	it("renders separators between segments", () => {
		render(<Breadcrumb {...defaultProps} />);
		const separators = document.querySelectorAll('[class*="separator"]');
		expect(separators.length).toBeGreaterThanOrEqual(2);
	});

	it("calls onNavigate when a segment is clicked", async () => {
		const onNavigate = vi.fn();
		render(<Breadcrumb {...defaultProps} onNavigate={onNavigate} />);
		const homeBtn = screen.getByTitle("/home");
		await userEvent.click(homeBtn);
		expect(onNavigate).toHaveBeenCalledWith("/home");
	});

	it("calls onNavigate with root path when root segment is clicked", async () => {
		const onNavigate = vi.fn();
		render(<Breadcrumb {...defaultProps} onNavigate={onNavigate} />);
		const rootBtn = screen.getByTitle("/");
		await userEvent.click(rootBtn);
		expect(onNavigate).toHaveBeenCalledWith("/");
	});

	it("renders hidden measurement layer", () => {
		render(<Breadcrumb {...defaultProps} />);
		const measureLayer = document.querySelector('[aria-hidden="true"]');
		expect(measureLayer).toBeInTheDocument();
	});

	it("renders all segments visible when path is short", () => {
		render(<Breadcrumb path="/home/user" onNavigate={vi.fn()} />);
		expect(screen.getByTitle("/")).toBeInTheDocument();
		expect(screen.getByTitle("/home")).toBeInTheDocument();
		expect(screen.getByTitle("/home/user")).toBeInTheDocument();
	});
});
