import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileContextMenu } from "./FileContextMenu";
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
		render(<FileContextMenu {...defaultProps} />);
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
		render(<FileContextMenu {...defaultProps} entry={entry} />);
		expect(screen.queryByText("Edit")).not.toBeInTheDocument();
	});

	it("hides Upload for files in local panel", () => {
		render(<FileContextMenu {...defaultProps} />);
		expect(screen.queryByText("Upload")).not.toBeInTheDocument();
	});

	it("shows Download for folders in remote panel", () => {
		const entry = makeEntry({ isDirectory: true });
		render(<FileContextMenu {...defaultProps} entry={entry} panelType="remote" />);
		expect(screen.getByText("Download")).toBeInTheDocument();
		expect(screen.queryByText("Upload")).not.toBeInTheDocument();
	});

	it("shows Upload for folders in local panel", () => {
		const entry = makeEntry({ isDirectory: true });
		render(<FileContextMenu {...defaultProps} entry={entry} panelType="local" />);
		expect(screen.getByText("Upload")).toBeInTheDocument();
		expect(screen.queryByText("Download")).not.toBeInTheDocument();
	});

	it("hides Open in terminal for files", () => {
		render(<FileContextMenu {...defaultProps} />);
		expect(screen.queryByText("Open in terminal")).not.toBeInTheDocument();
	});

	it("shows Open in terminal for directories", () => {
		const entry = makeEntry({ isDirectory: true });
		render(<FileContextMenu {...defaultProps} entry={entry} />);
		expect(screen.getByText("Open in terminal")).toBeInTheDocument();
	});

	it("calls onClose on Escape key", () => {
		const onClose = vi.fn();
		render(<FileContextMenu {...defaultProps} onClose={onClose} />);
		fireEvent.keyDown(document, { key: "Escape" });
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("positions menu at given coordinates", () => {
		const { container } = render(<FileContextMenu {...defaultProps} x={150} y={250} />);
		const menu = container.firstElementChild as HTMLElement;
		expect(menu.style.left).toBe("150px");
		expect(menu.style.top).toBe("250px");
	});

	it("stops propagation on click", async () => {
		const user = userEvent.setup();
		const outerClick = vi.fn();
		render(
			<div onClick={outerClick}>
				<FileContextMenu {...defaultProps} />
			</div>,
		);
		await user.click(screen.getByText("Open"));
		expect(outerClick).not.toHaveBeenCalled();
	});

	it("navigates items with arrow keys", () => {
		render(<FileContextMenu {...defaultProps} />);
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
});
