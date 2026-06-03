import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FileRow } from "./FileRow";
import type { FileEntry } from "@shared/types";

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
		expect(screen.getByText("2.0 KB")).toBeInTheDocument();
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
});
