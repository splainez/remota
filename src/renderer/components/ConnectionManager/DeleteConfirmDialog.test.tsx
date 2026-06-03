import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

describe("DeleteConfirmDialog", () => {
	it("renders title and description", () => {
		render(
			<I18nWrapper>
				<DeleteConfirmDialog title="Delete Connection" description="My Server" onConfirm={vi.fn()} onCancel={vi.fn()} />
			</I18nWrapper>,
		);
		expect(screen.getByText("Delete Connection")).toBeInTheDocument();
		expect(screen.getByText("My Server")).toBeInTheDocument();
	});

	it("calls onCancel when cancel is clicked", async () => {
		const user = userEvent.setup();
		const onCancel = vi.fn();
		render(
			<I18nWrapper>
				<DeleteConfirmDialog title="Delete" description="Test" onConfirm={vi.fn()} onCancel={onCancel} />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: "Cancel" }));
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it("calls onConfirm when delete is clicked", async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();
		render(
			<I18nWrapper>
				<DeleteConfirmDialog title="Delete" description="Test" onConfirm={onConfirm} onCancel={vi.fn()} />
			</I18nWrapper>,
		);
		await user.click(screen.getByRole("button", { name: "Delete" }));
		expect(onConfirm).toHaveBeenCalledOnce();
	});
});
