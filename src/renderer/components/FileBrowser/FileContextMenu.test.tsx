import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileContextMenu } from "./FileContextMenu";
import { I18nWrapper } from "../../test/i18n-wrapper";
import type { FileEntry } from "../../../shared/types";

vi.mock("sonner", () => ({
	toast: vi.fn(),
}));

function makeEntry(overrides: Partial<FileEntry> = {}): FileEntry {
	return {
		name: "test.txt",
		fullPath: "/home/test.txt",
		isDirectory: false,
		size: 1024,
		modified: "2025-01-15T10:30:00Z",
		...overrides,
	};
}

describe("FileContextMenu", () => {
	const defaultProps = {
		x: 100,
		y: 200,
		entry: makeEntry(),
		panelType: "local" as const,
		onClose: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders all menu items for a local file", () => {
		render(
			<I18nWrapper>
				<FileContextMenu {...defaultProps} />
			</I18nWrapper>,
		);
		expect(screen.getByText("Open")).toBeInTheDocument();
		expect(screen.getByText("Edit")).toBeInTheDocument();
		expect(screen.getByText("Rename")).toBeInTheDocument();
		expect(screen.getByText("Delete")).toBeInTheDocument();
		expect(screen.getByText("Copy path to clipboard")).toBeInTheDocument();
		expect(screen.getByText("Copy filename")).toBeInTheDocument();
		expect(screen.queryByText("Upload")).not.toBeInTheDocument();
		expect(screen.queryByText("Open in terminal")).not.toBeInTheDocument();
	});

	it("hides Edit for directories", () => {
		const entry = makeEntry({ isDirectory: true });
		render(
			<I18nWrapper>
				<FileContextMenu {...defaultProps} entry={entry} />
			</I18nWrapper>,
		);
		expect(screen.queryByText("Edit")).not.toBeInTheDocument();
	});

	it("hides Upload for files in local panel", () => {
		render(
			<I18nWrapper>
				<FileContextMenu {...defaultProps} />
			</I18nWrapper>,
		);
		expect(screen.queryByText("Upload")).not.toBeInTheDocument();
	});

	it("shows Download for folders in remote panel", () => {
		const entry = makeEntry({ isDirectory: true });
		render(
			<I18nWrapper>
				<FileContextMenu {...defaultProps} entry={entry} panelType="remote" />
			</I18nWrapper>,
		);
		expect(screen.getByText("Download")).toBeInTheDocument();
		expect(screen.queryByText("Upload")).not.toBeInTheDocument();
	});

	it("shows Upload for folders in local panel", () => {
		const entry = makeEntry({ isDirectory: true });
		render(
			<I18nWrapper>
				<FileContextMenu {...defaultProps} entry={entry} panelType="local" />
			</I18nWrapper>,
		);
		expect(screen.getByText("Upload")).toBeInTheDocument();
		expect(screen.queryByText("Download")).not.toBeInTheDocument();
	});

	it("hides Open in terminal for files", () => {
		render(
			<I18nWrapper>
				<FileContextMenu {...defaultProps} />
			</I18nWrapper>,
		);
		expect(screen.queryByText("Open in terminal")).not.toBeInTheDocument();
	});

	it("shows Open in terminal for directories", () => {
		const entry = makeEntry({ isDirectory: true });
		render(
			<I18nWrapper>
				<FileContextMenu {...defaultProps} entry={entry} />
			</I18nWrapper>,
		);
		expect(screen.getByText("Open in terminal")).toBeInTheDocument();
	});

	it("calls onClose on Escape key", () => {
		const onClose = vi.fn();
		render(
			<I18nWrapper>
				<FileContextMenu {...defaultProps} onClose={onClose} />
			</I18nWrapper>,
		);
		fireEvent.keyDown(document, { key: "Escape" });
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("positions menu at given coordinates", () => {
		const { container } = render(
			<I18nWrapper>
				<FileContextMenu {...defaultProps} x={150} y={250} />
			</I18nWrapper>,
		);
		const menu = container.firstElementChild as HTMLElement;
		expect(menu.style.left).toBe("150px");
		expect(menu.style.top).toBe("250px");
	});

	it("stops propagation on click", async () => {
		const user = userEvent.setup();
		const outerClick = vi.fn();
		render(
			<I18nWrapper>
				<div onClick={outerClick}>
					<FileContextMenu {...defaultProps} />
				</div>
			</I18nWrapper>,
		);
		await user.click(screen.getByText("Open"));
		expect(outerClick).not.toHaveBeenCalled();
	});

	it("navigates items with arrow keys", () => {
		render(
			<I18nWrapper>
				<FileContextMenu {...defaultProps} />
			</I18nWrapper>,
		);
		const menu = screen.getByRole("menu");
		const items = menu.querySelectorAll("[role='menuitem']");
		expect(items.length).toBeGreaterThan(1);

		fireEvent.keyDown(document, { key: "ArrowDown" });
		expect(items[1]).toHaveFocus();

		fireEvent.keyDown(document, { key: "ArrowDown" });
		expect(items[2]).toHaveFocus();

		fireEvent.keyDown(document, { key: "ArrowUp" });
		expect(items[1]).toHaveFocus();
	});

	it("calls onAction with 'open' and entry when Open is clicked", async () => {
		const user = userEvent.setup();
		const onAction = vi.fn();
		const entry = makeEntry();
		render(
			<I18nWrapper>
				<FileContextMenu {...defaultProps} entry={entry} onAction={onAction} />
			</I18nWrapper>,
		);
		await user.click(screen.getByText("Open"));
		expect(onAction).toHaveBeenCalledOnce();
		expect(onAction).toHaveBeenCalledWith("open", entry);
	});

	it("calls onClose after onAction", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(
			<I18nWrapper>
				<FileContextMenu {...defaultProps} onClose={onClose} onAction={vi.fn()} />
			</I18nWrapper>,
		);
		await user.click(screen.getByText("Open"));
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("calls onAction with correct id for each menu item", async () => {
		const user = userEvent.setup();
		const onAction = vi.fn();
		const entry = makeEntry({ name: "readme.md", fullPath: "/home/readme.md" });
		render(
			<I18nWrapper>
				<FileContextMenu {...defaultProps} entry={entry} onAction={onAction} />
			</I18nWrapper>,
		);

		await user.click(screen.getByText("Open"));
		expect(onAction).toHaveBeenCalledWith("open", entry);

		vi.clearAllMocks();

		await user.click(screen.getByText("Edit"));
		expect(onAction).toHaveBeenCalledWith("edit", entry);

		vi.clearAllMocks();

		await user.click(screen.getByText("Rename"));
		expect(onAction).toHaveBeenCalledWith("rename", entry);

		vi.clearAllMocks();

		await user.click(screen.getByText("Delete"));
		expect(onAction).toHaveBeenCalledWith("delete", entry);
	});

	it("does not call onAction when not provided", async () => {
		const user = userEvent.setup();
		render(
			<I18nWrapper>
				<FileContextMenu {...defaultProps} />
			</I18nWrapper>,
		);
		await user.click(screen.getByText("Open"));
		expect(screen.getByRole("menu")).toBeInTheDocument();
	});
});
