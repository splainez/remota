import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FormFooter } from "./FormFooter";

describe("FormFooter", () => {
	it("renders cancel, save, and connect buttons", () => {
		render(<FormFooter onCancel={vi.fn()} onSave={vi.fn()} onConnect={vi.fn()} />);
		expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Save Connection" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
	});

	it("calls onCancel when cancel is clicked", async () => {
		const user = userEvent.setup();
		const onCancel = vi.fn();
		render(<FormFooter onCancel={onCancel} onSave={vi.fn()} onConnect={vi.fn()} />);
		await user.click(screen.getByRole("button", { name: "Cancel" }));
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it("calls onSave when save is clicked", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();
		render(<FormFooter onCancel={vi.fn()} onSave={onSave} onConnect={vi.fn()} />);
		await user.click(screen.getByRole("button", { name: "Save Connection" }));
		expect(onSave).toHaveBeenCalledOnce();
	});

	it("calls onConnect when connect is clicked", async () => {
		const user = userEvent.setup();
		const onConnect = vi.fn();
		render(<FormFooter onCancel={vi.fn()} onSave={vi.fn()} onConnect={onConnect} />);
		await user.click(screen.getByRole("button", { name: "Connect" }));
		expect(onConnect).toHaveBeenCalledOnce();
	});
});
