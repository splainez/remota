import type { FileEntry } from "@shared/types";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { FileRow } from "./FileRow";

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

describe("FileRow", () => {
	it("renders file name", () => {
		const entry = makeEntry();
		render(<FileRow entry={entry} isSelected={false} onClick={vi.fn()} onDoubleClick={vi.fn()} />);
		expect(screen.getByText("test.txt")).toBeInTheDocument();
	});

	it("renders file size using formatSize", () => {
		const entry = makeEntry({ size: 2048 });
		render(<FileRow entry={entry} isSelected={false} onClick={vi.fn()} onDoubleClick={vi.fn()} />);
		expect(screen.getByText("2 KiB")).toBeInTheDocument();
	});

	it("renders -- for directory size", () => {
		const entry = makeEntry({ isDirectory: true });
		render(<FileRow entry={entry} isSelected={false} onClick={vi.fn()} onDoubleClick={vi.fn()} />);
		expect(screen.getByText("--")).toBeInTheDocument();
	});

	it("applies selection styling when selected", () => {
		const entry = makeEntry();
		const { container } = render(<FileRow entry={entry} isSelected={true} onClick={vi.fn()} onDoubleClick={vi.fn()} />);
		expect(container.firstElementChild?.className).toContain("bg-primary-fixed-dim/20");
	});

	it("does not apply selection styling when not selected", () => {
		const entry = makeEntry();
		const { container } = render(
			<FileRow entry={entry} isSelected={false} onClick={vi.fn()} onDoubleClick={vi.fn()} />,
		);
		expect(container.firstElementChild?.className).not.toContain("bg-primary-fixed-dim/20");
	});

	it("calls onClick on click", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		const entry = makeEntry();
		render(<FileRow entry={entry} isSelected={false} onClick={onClick} onDoubleClick={vi.fn()} />);
		await user.click(screen.getByText("test.txt"));
		expect(onClick).toHaveBeenCalledOnce();
	});

	it("calls onDoubleClick on double click", async () => {
		const user = userEvent.setup();
		const onDoubleClick = vi.fn();
		const entry = makeEntry();
		render(<FileRow entry={entry} isSelected={false} onClick={vi.fn()} onDoubleClick={onDoubleClick} />);
		await user.dblClick(screen.getByText("test.txt"));
		expect(onDoubleClick).toHaveBeenCalledOnce();
	});

	it("displays formatted date in hidden column", () => {
		const entry = makeEntry({ modified: "2025-01-15T10:30:00Z" });
		render(<FileRow entry={entry} isSelected={false} onClick={vi.fn()} onDoubleClick={vi.fn()} />);
		expect(screen.getByText("2025-01-15")).toBeInTheDocument();
	});

	it("shows folder icon for directories", () => {
		const entry = makeEntry({ isDirectory: true, name: "mydir" });
		render(<FileRow entry={entry} isSelected={false} onClick={vi.fn()} onDoubleClick={vi.fn()} />);
		expect(screen.getByText("mydir")).toBeInTheDocument();
	});

	it("shows file icon for files", () => {
		const entry = makeEntry({ isDirectory: false, name: "readme.md" });
		render(<FileRow entry={entry} isSelected={false} onClick={vi.fn()} onDoubleClick={vi.fn()} />);
		expect(screen.getByText("readme.md")).toBeInTheDocument();
	});

	// --- rename (inline edit) ---

	it("renders an input pre-filled with the current name when editing", () => {
		const entry = makeEntry({ name: "draft.txt" });
		render(
			<FileRow
				entry={entry}
				isSelected={false}
				onClick={vi.fn()}
				onDoubleClick={vi.fn()}
				isEditing={true}
				onCommitRename={vi.fn()}
				onCancelRename={vi.fn()}
			/>,
		);
		const input = screen.getByTestId<HTMLInputElement>("rename-input");
		expect(input).toBeInTheDocument();
		expect(input.value).toBe("draft.txt");
	});

	it("selects all text in the rename input on focus", () => {
		const entry = makeEntry({ name: "draft.txt" });
		render(
			<FileRow
				entry={entry}
				isSelected={false}
				onClick={vi.fn()}
				onDoubleClick={vi.fn()}
				isEditing={true}
				onCommitRename={vi.fn()}
				onCancelRename={vi.fn()}
			/>,
		);
		const input = screen.getByTestId<HTMLInputElement>("rename-input");
		expect(document.activeElement).toBe(input);
		expect(input.selectionStart).toBe(0);
		expect(input.selectionEnd).toBe("draft.txt".length);
	});

	it("calls onCommitRename with trimmed name on Enter", async () => {
		const user = userEvent.setup();
		const onCommitRename = vi.fn();
		const entry = makeEntry({ name: "draft.txt" });
		render(
			<FileRow
				entry={entry}
				isSelected={false}
				onClick={vi.fn()}
				onDoubleClick={vi.fn()}
				isEditing={true}
				onCommitRename={onCommitRename}
				onCancelRename={vi.fn()}
			/>,
		);
		const input = screen.getByTestId("rename-input");
		await user.clear(input);
		await user.type(input, "  final.md  ");
		await user.keyboard("{Enter}");
		expect(onCommitRename).toHaveBeenCalledWith("final.md");
	});

	it("calls onCancelRename on Escape and does not commit", async () => {
		const user = userEvent.setup();
		const onCommitRename = vi.fn();
		const onCancelRename = vi.fn();
		const entry = makeEntry({ name: "draft.txt" });
		render(
			<FileRow
				entry={entry}
				isSelected={false}
				onClick={vi.fn()}
				onDoubleClick={vi.fn()}
				isEditing={true}
				onCommitRename={onCommitRename}
				onCancelRename={onCancelRename}
			/>,
		);
		const input = screen.getByTestId("rename-input");
		await user.clear(input);
		await user.type(input, "changed");
		await user.keyboard("{Escape}");
		expect(onCancelRename).toHaveBeenCalledOnce();
		expect(onCommitRename).not.toHaveBeenCalled();
	});

	it("calls onCommitRename on blur", async () => {
		const user = userEvent.setup();
		const onCommitRename = vi.fn();
		const entry = makeEntry({ name: "draft.txt" });
		render(
			<div>
				<FileRow
					entry={entry}
					isSelected={false}
					onClick={vi.fn()}
					onDoubleClick={vi.fn()}
					isEditing={true}
					onCommitRename={onCommitRename}
					onCancelRename={vi.fn()}
				/>
				<button data-testid="outside">outside</button>
			</div>,
		);
		const input = screen.getByTestId("rename-input");
		await user.click(input);
		await user.click(screen.getByTestId("outside"));
		expect(onCommitRename).toHaveBeenCalledOnce();
	});

	it("does not call onClick / onDoubleClick / onContextMenu while editing", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		const onDoubleClick = vi.fn();
		const onContextMenu = vi.fn();
		const entry = makeEntry({ name: "draft.txt" });
		const { container } = render(
			<FileRow
				entry={entry}
				isSelected={false}
				onClick={onClick}
				onDoubleClick={onDoubleClick}
				onContextMenu={onContextMenu}
				isEditing={true}
				onCommitRename={vi.fn()}
				onCancelRename={vi.fn()}
			/>,
		);
		const row = container.firstElementChild as HTMLElement;
		await user.click(row);
		await user.dblClick(row);
		fireEvent.contextMenu(row);
		expect(onClick).not.toHaveBeenCalled();
		expect(onDoubleClick).not.toHaveBeenCalled();
		expect(onContextMenu).not.toHaveBeenCalled();
	});

	it("does not render the input when not editing", () => {
		const entry = makeEntry();
		render(<FileRow entry={entry} isSelected={false} onClick={vi.fn()} onDoubleClick={vi.fn()} />);
		expect(screen.queryByTestId("rename-input")).not.toBeInTheDocument();
		expect(screen.getByText("test.txt")).toBeInTheDocument();
	});
});
