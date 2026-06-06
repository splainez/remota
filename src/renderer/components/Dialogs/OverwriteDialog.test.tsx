import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { OverwriteDialog, type OverwriteDecision, type OverwriteDialogProps } from "./OverwriteDialog";

const baseProps: OverwriteDialogProps = {
	open: true,
	fileName: "report.pdf",
	localPath: "/downloads/report.pdf",
	remotePath: "/remote/report.pdf",
	localSize: 1024,
	localModified: "2024-01-15T10:30:00Z",
	remoteSize: 2048,
	remoteModified: "2024-02-20T14:00:00Z",
	remaining: 3,
	onResolve: vi.fn(),
};

function renderDialog(props: Partial<OverwriteDialogProps> = {}) {
	return render(
		<I18nWrapper>
			<OverwriteDialog {...baseProps} {...props} />
		</I18nWrapper>,
	);
}

describe("OverwriteDialog", () => {
	it("renders the file name in the description", () => {
		renderDialog();
		expect(screen.getByText(/already exists.*Overwrite it\?/)).toBeInTheDocument();
	});

	it("renders the local and remote modification dates", () => {
		renderDialog();
		expect(screen.getAllByText(/2024-01-15/).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/2024-02-20/).length).toBeGreaterThan(0);
	});

	it("renders the dash placeholder when local is missing", () => {
		renderDialog({ localSize: null, localModified: null });
		const cells = screen.getAllByText("\u2014");
		expect(cells.length).toBeGreaterThanOrEqual(2);
	});

	it("shows the bulk actions only when more than one conflict remains", () => {
		const { rerender } = renderDialog({ remaining: 1 });
		expect(screen.queryByText("No to all")).not.toBeInTheDocument();
		expect(screen.queryByText("Yes to all")).not.toBeInTheDocument();

		rerender(
			<I18nWrapper>
				<OverwriteDialog {...baseProps} remaining={5} />
			</I18nWrapper>,
		);
		expect(screen.getByText("No to all")).toBeInTheDocument();
		expect(screen.getByText("Yes to all")).toBeInTheDocument();
	});

	it("clicking 'No' resolves with skip", async () => {
		const user = userEvent.setup();
		const onResolve = vi.fn();
		renderDialog({ onResolve, remaining: 1 });
		await user.click(screen.getByText("No"));
		expect(onResolve).toHaveBeenCalledWith<[OverwriteDecision]>("skip");
	});

	it("clicking 'Yes' resolves with overwrite", async () => {
		const user = userEvent.setup();
		const onResolve = vi.fn();
		renderDialog({ onResolve, remaining: 1 });
		await user.click(screen.getByText("Yes"));
		expect(onResolve).toHaveBeenCalledWith<[OverwriteDecision]>("overwrite");
	});

	it("clicking 'Cancel' resolves with cancel", async () => {
		const user = userEvent.setup();
		const onResolve = vi.fn();
		renderDialog({ onResolve, remaining: 1 });
		await user.click(screen.getByText("Cancel"));
		expect(onResolve).toHaveBeenCalledWith<[OverwriteDecision]>("cancel");
	});

	it("clicking 'Yes to all' resolves with overwriteAll", async () => {
		const user = userEvent.setup();
		const onResolve = vi.fn();
		renderDialog({ onResolve, remaining: 3 });
		await user.click(screen.getByText("Yes to all"));
		expect(onResolve).toHaveBeenCalledWith<[OverwriteDecision]>("overwriteAll");
	});

	it("clicking 'No to all' resolves with skipAll", async () => {
		const user = userEvent.setup();
		const onResolve = vi.fn();
		renderDialog({ onResolve, remaining: 3 });
		await user.click(screen.getByText("No to all"));
		expect(onResolve).toHaveBeenCalledWith<[OverwriteDecision]>("skipAll");
	});

	it("keyboard Y resolves with overwrite", () => {
		const onResolve = vi.fn();
		renderDialog({ onResolve });
		fireEvent.keyDown(document, { key: "y" });
		expect(onResolve).toHaveBeenCalledWith("overwrite");
	});

	it("keyboard N resolves with skip", () => {
		const onResolve = vi.fn();
		renderDialog({ onResolve });
		fireEvent.keyDown(document, { key: "n" });
		expect(onResolve).toHaveBeenCalledWith("skip");
	});

	it("keyboard A resolves with overwriteAll", () => {
		const onResolve = vi.fn();
		renderDialog({ onResolve });
		fireEvent.keyDown(document, { key: "a" });
		expect(onResolve).toHaveBeenCalledWith("overwriteAll");
	});

	it("keyboard O resolves with skipAll", () => {
		const onResolve = vi.fn();
		renderDialog({ onResolve });
		fireEvent.keyDown(document, { key: "o" });
		expect(onResolve).toHaveBeenCalledWith("skipAll");
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
