import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { MenuItem, MenuItemSeparator } from "./menu-item";

describe("MenuItem", () => {
	it("renders children and has menuitem role", () => {
		render(<MenuItem>Edit connection</MenuItem>);
		const item = screen.getByRole("menuitem", { name: "Edit connection" });
		expect(item).toBeInTheDocument();
		expect(item).toHaveAttribute("data-slot", "menu-item");
	});

	it("renders the icon when provided", () => {
		const { container } = render(<MenuItem icon="edit">Edit</MenuItem>);
		expect(container.querySelector("svg")).toBeInTheDocument();
	});

	it("does not render an svg when no icon is provided", () => {
		const { container } = render(<MenuItem>Plain item</MenuItem>);
		expect(container.querySelector("svg")).toBeNull();
	});

	it("applies default variant classes", () => {
		render(<MenuItem>Default</MenuItem>);
		const item = screen.getByRole("menuitem");
		expect(item).toHaveAttribute("data-variant", "default");
		expect(item).not.toHaveAttribute("data-selected");
		expect(item.className).toContain("text-popover-foreground");
	});

	it("applies destructive variant classes", () => {
		render(<MenuItem variant="destructive">Delete</MenuItem>);
		const item = screen.getByRole("menuitem");
		expect(item).toHaveAttribute("data-variant", "destructive");
		expect(item.className).toContain("text-destructive");
		expect(item.className).toContain("hover:bg-destructive/10");
	});

	it("applies selected classes when selected", () => {
		render(<MenuItem selected>Selected</MenuItem>);
		const item = screen.getByRole("menuitem");
		expect(item).toHaveAttribute("data-selected", "");
		expect(item.className).toContain("text-primary");
		expect(item.className).toContain("bg-primary/10");
	});

	it("calls onClick handler when clicked", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		render(<MenuItem onClick={onClick}>Click me</MenuItem>);
		await user.click(screen.getByRole("menuitem"));
		expect(onClick).toHaveBeenCalledOnce();
	});

	it("does not fire onClick when disabled", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		render(
			<MenuItem disabled onClick={onClick}>
				Disabled
			</MenuItem>,
		);
		await user.click(screen.getByRole("menuitem"));
		expect(onClick).not.toHaveBeenCalled();
	});

	it("merges custom className", () => {
		render(<MenuItem className="custom-class">Custom</MenuItem>);
		expect(screen.getByRole("menuitem").className).toContain("custom-class");
	});
});

describe("MenuItemSeparator", () => {
	it("renders with separator role", () => {
		render(<MenuItemSeparator data-testid="sep" />);
		const sep = screen.getByTestId("sep");
		expect(sep).toHaveAttribute("role", "separator");
		expect(sep).toHaveAttribute("data-slot", "menu-item-separator");
	});
});
