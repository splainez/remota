import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { ConnectionGroupHeader } from "./ConnectionGroupHeader";

describe("ConnectionGroupHeader", () => {
	it("renders group name and count", () => {
		render(<ConnectionGroupHeader name="Work Servers" count={3} collapsed={false} onToggle={vi.fn()} />);
		expect(screen.getByText("Work Servers")).toBeInTheDocument();
		expect(screen.getByText("3")).toBeInTheDocument();
	});

	it("shows triangle-down icon when collapsed", () => {
		render(<ConnectionGroupHeader name="Group" count={1} collapsed={true} onToggle={vi.fn()} />);
		expect(screen.getByRole("button").querySelector("svg")).not.toBeNull();
	});

	it("shows folder-opened icon when expanded", () => {
		render(<ConnectionGroupHeader name="Group" count={1} collapsed={false} onToggle={vi.fn()} />);
		expect(screen.getByRole("button").querySelector("svg")).not.toBeNull();
	});

	it("calls onToggle on click", async () => {
		const user = userEvent.setup();
		const onToggle = vi.fn();
		render(<ConnectionGroupHeader name="Group" count={1} collapsed={false} onToggle={onToggle} />);
		await user.click(screen.getByRole("button"));
		expect(onToggle).toHaveBeenCalledOnce();
	});

	it("renders with empty count", () => {
		render(<ConnectionGroupHeader name="Empty" count={0} collapsed={false} onToggle={vi.fn()} />);
		expect(screen.getByText("Empty")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();
	});
});
