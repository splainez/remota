import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { QuitConfirmDialog, type QuitConfirmDialogProps } from "./QuitConfirmDialog";

const baseProps: QuitConfirmDialogProps = {
	open: true,
	onOpenChange: vi.fn(),
	onConfirmQuit: vi.fn(),
};

function renderDialog(props: Partial<QuitConfirmDialogProps> = {}) {
	return render(
		<I18nWrapper>
			<QuitConfirmDialog {...baseProps} {...props} />
		</I18nWrapper>,
	);
}

describe("QuitConfirmDialog", () => {
	it("renders title and description", () => {
		renderDialog();
		expect(screen.getByText("Active transfers in progress")).toBeInTheDocument();
		expect(screen.getByText(/active file transfers/)).toBeInTheDocument();
	});

	it("clicking Quit calls onConfirmQuit", async () => {
		const user = userEvent.setup();
		const onConfirmQuit = vi.fn();
		renderDialog({ onConfirmQuit });
		await user.click(screen.getByText("Quit"));
		expect(onConfirmQuit).toHaveBeenCalledTimes(1);
	});

	it("clicking Cancel calls onOpenChange with false", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();
		renderDialog({ onOpenChange });
		await user.click(screen.getByText("Cancel"));
		expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
	});

	it("does not render when closed", () => {
		renderDialog({ open: false });
		expect(screen.queryByText("Active transfers in progress")).not.toBeInTheDocument();
	});
});
