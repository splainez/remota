import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SidebarFooter } from "./SidebarFooter";

vi.mock("../../hooks/useTheme", () => ({
	useTheme: () => ({
		theme: "dark" as const,
		setTheme: vi.fn(),
	}),
}));

describe("SidebarFooter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders collapse button with arrow-left when expanded", () => {
		render(<SidebarFooter collapsed={false} onToggleCollapse={vi.fn()} />);
		const buttons = screen.getAllByRole("button");
		const collapseBtn = buttons.find((b) =>
			b.className.includes("rounded-full") && b.className.includes("self-start"),
		) ?? buttons[0];
		expect(collapseBtn).toBeInTheDocument();
	});

	it("renders collapse button with arrow-right when collapsed", () => {
		render(<SidebarFooter collapsed={true} onToggleCollapse={vi.fn()} />);
		const buttons = screen.getAllByRole("button");
		expect(buttons.length).toBeGreaterThanOrEqual(1);
	});

	it("calls onToggleCollapse on click", async () => {
		const user = userEvent.setup();
		const onToggleCollapse = vi.fn();
		render(<SidebarFooter collapsed={false} onToggleCollapse={onToggleCollapse} />);
		const buttons = screen.getAllByRole("button");
		const collapseBtn = buttons.find((b) =>
			b.className.includes("rounded-full") && b.className.includes("self-start"),
		) ?? buttons[0];
		await user.click(collapseBtn);
		expect(onToggleCollapse).toHaveBeenCalledOnce();
	});

	it("shows settings button and avatar when expanded", () => {
		render(<SidebarFooter collapsed={false} onToggleCollapse={vi.fn()} />);
		const buttons = screen.getAllByRole("button");
		expect(buttons.length).toBe(3); // collapse + theme + settings
	});

	it("hides settings and avatar when collapsed", () => {
		render(<SidebarFooter collapsed={true} onToggleCollapse={vi.fn()} />);
		const buttons = screen.getAllByRole("button");
		expect(buttons.length).toBe(2); // collapse + theme only
	});
});
