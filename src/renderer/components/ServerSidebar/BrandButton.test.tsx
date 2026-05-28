import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { BrandButton } from "./BrandButton";

describe("BrandButton", () => {
	it("renders the app title when not collapsed", () => {
		render(<BrandButton collapsed={false} onViewAll={vi.fn()} />);
		expect(screen.getByText("OpenSCP")).toBeInTheDocument();
	});

	it("hides text content when collapsed", () => {
		render(<BrandButton collapsed={true} onViewAll={vi.fn()} />);
		expect(screen.queryByText("OpenSCP")).not.toBeInTheDocument();
	});

	it("calls onViewAll on click", async () => {
		const user = userEvent.setup();
		const onViewAll = vi.fn();
		render(<BrandButton collapsed={false} onViewAll={onViewAll} />);
		await user.click(screen.getByTitle("OpenSCP"));
		expect(onViewAll).toHaveBeenCalledOnce();
	});

	it("calls onViewAll on Enter key", async () => {
		const user = userEvent.setup();
		const onViewAll = vi.fn();
		render(<BrandButton collapsed={false} onViewAll={onViewAll} />);
		const outerDiv = screen.getByText("OpenSCP").closest('[role="button"]');
		if (outerDiv instanceof HTMLElement) {
			outerDiv.focus();
		}
		await user.keyboard("{Enter}");
		expect(onViewAll).toHaveBeenCalled();
	});

	it("calls onViewAll on Space key", async () => {
		const user = userEvent.setup();
		const onViewAll = vi.fn();
		render(<BrandButton collapsed={false} onViewAll={onViewAll} />);
		const outerDiv = screen.getByText("OpenSCP").closest('[role="button"]');
		if (outerDiv instanceof HTMLElement) {
			outerDiv.focus();
		}
		await user.keyboard(" ");
		expect(onViewAll).toHaveBeenCalled();
	});
});
