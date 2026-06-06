import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { DeleteConfirmDialog, type DeleteDecision, type DeleteConfirmDialogProps } from "./DeleteConfirmDialog";

const baseProps: DeleteConfirmDialogProps = {
	open: true,
	itemName: "report.pdf",
	remaining: 1,
	onResolve: vi.fn(),
};

function renderDialog(props: Partial<DeleteConfirmDialogProps> = {}) {
	return render(
		<I18nWrapper>
			<DeleteConfirmDialog {...baseProps} {...props} />
		</I18nWrapper>,
	);
}

describe("DeleteConfirmDialog", () => {
	it("renders the item name in the description for single item", () => {
		renderDialog({ remaining: 1 });
		expect(screen.getByText(/report\.pdf/)).toBeInTheDocument();
	});

	it("shows bulk actions only when more than one item remains", () => {
		const { rerender } = renderDialog({ remaining: 1 });
		expect(screen.queryByText("Yes to all")).not.toBeInTheDocument();
		expect(screen.queryByText("No to all")).not.toBeInTheDocument();

		rerender(
			<I18nWrapper>
				<DeleteConfirmDialog {...baseProps} remaining={5} />
			</I18nWrapper>,
		);
		expect(screen.getByText("Yes to all")).toBeInTheDocument();
		expect(screen.getByText("No to all")).toBeInTheDocument();
	});

	it("clicking 'Yes' resolves with delete", async () => {
		const user = userEvent.setup();
		const onResolve = vi.fn();
		renderDialog({ onResolve, remaining: 1 });
		await user.click(screen.getByText("Yes"));
		expect(onResolve).toHaveBeenCalledWith<[DeleteDecision]>("delete");
	});

	it("clicking 'Yes to all' resolves with deleteAll", async () => {
		const user = userEvent.setup();
		const onResolve = vi.fn();
		renderDialog({ onResolve, remaining: 3 });
		await user.click(screen.getByText("Yes to all"));
		expect(onResolve).toHaveBeenCalledWith<[DeleteDecision]>("deleteAll");
	});

	it("clicking 'Cancel' resolves with cancel", async () => {
		const user = userEvent.setup();
		const onResolve = vi.fn();
		renderDialog({ onResolve, remaining: 1 });
		await user.click(screen.getByText("Cancel"));
		expect(onResolve).toHaveBeenCalledWith<[DeleteDecision]>("cancel");
	});

	it("keyboard Y resolves with delete", () => {
		const onResolve = vi.fn();
		renderDialog({ onResolve });
		fireEvent.keyDown(document, { key: "y" });
		expect(onResolve).toHaveBeenCalledWith("delete");
	});

	it("keyboard A resolves with deleteAll", () => {
		const onResolve = vi.fn();
		renderDialog({ onResolve });
		fireEvent.keyDown(document, { key: "a" });
		expect(onResolve).toHaveBeenCalledWith("deleteAll");
	});

	it("keyboard Escape resolves with cancel", () => {
		const onResolve = vi.fn();
		renderDialog({ onResolve });
		fireEvent.keyDown(document, { key: "Escape" });
		expect(onResolve).toHaveBeenCalledWith("cancel");
	});

	it("ignores keyboard when closed", () => {
		const onResolve = vi.fn();
		renderDialog({ onResolve, open: false });
		fireEvent.keyDown(document, { key: "y" });
		expect(onResolve).not.toHaveBeenCalled();
	});
});
