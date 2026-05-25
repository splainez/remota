import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileList } from "./FileList";
import type { FileEntry } from "../../../shared/types";

function makeEntry(
	name: string,
	isDirectory: boolean,
	size: number,
	modified: string,
): FileEntry {
	return { name, isDirectory, size, modified };
}

const sampleEntries: FileEntry[] = [
	makeEntry("projects", true, 0, "2025-05-20T10:00:00Z"),
	makeEntry("documents", true, 0, "2025-05-15T08:00:00Z"),
	makeEntry("readme.md", false, 1024, "2025-01-01T00:00:00Z"),
	makeEntry("config.json", false, 2048, "2024-06-01T12:00:00Z"),
];

describe("FileList", () => {
	const defaultProps = {
		entries: sampleEntries,
		loading: false,
		error: null,
		onEnterDirectory: vi.fn(),
		onSelectEntry: vi.fn(),
		selectedNames: [] as string[],
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders loading state", () => {
		render(<FileList {...defaultProps} entries={[]} loading={true} />);
		expect(screen.getByText("Loading...")).toBeInTheDocument();
	});

	it("renders error state", () => {
		render(<FileList {...defaultProps} entries={[]} error="Permission denied" />);
		expect(screen.getByText("Permission denied")).toBeInTheDocument();
	});

	it("renders empty state", () => {
		render(<FileList {...defaultProps} entries={[]} />);
		expect(screen.getByText("This folder is empty")).toBeInTheDocument();
	});

	it("renders all entries with folders first", () => {
		render(<FileList {...defaultProps} />);
		const rows = document.querySelectorAll("div.cursor-pointer");
		expect(rows.length).toBe(4);
		expect(rows[0].textContent).toContain("documents");
		expect(rows[1].textContent).toContain("projects");
	});

	it("calls onEnterDirectory when a directory is double-clicked", async () => {
		const onEnterDirectory = vi.fn();
		render(<FileList {...defaultProps} onEnterDirectory={onEnterDirectory} />);
		await userEvent.dblClick(screen.getByText("projects"));
		expect(onEnterDirectory).toHaveBeenCalledWith("projects");
	});

	it("does not call onEnterDirectory when a file is double-clicked", async () => {
		const onEnterDirectory = vi.fn();
		render(<FileList {...defaultProps} onEnterDirectory={onEnterDirectory} />);
		await userEvent.dblClick(screen.getByText("readme.md"));
		expect(onEnterDirectory).not.toHaveBeenCalled();
	});

	it("sorts by name descending on first click (dirs always first)", async () => {
		render(<FileList {...defaultProps} />);
		const nameHeader = screen.getByRole("button", { name: /name/i });
		await userEvent.click(nameHeader);
		const cells = document.querySelectorAll('[class*="gap-1.5"]');
		expect(cells[0].textContent).toContain("projects");
		expect(cells[1].textContent).toContain("documents");
		expect(cells[2].textContent).toContain("readme.md");
		expect(cells[3].textContent).toContain("config.json");
	});

	it("default sort is by name ascending (folders first)", () => {
		render(<FileList {...defaultProps} />);
		const cells = document.querySelectorAll('[class*="gap-1.5"]');
		expect(cells[0].textContent).toContain("documents");
		expect(cells[1].textContent).toContain("projects");
		expect(cells[2].textContent).toContain("config.json");
		expect(cells[3].textContent).toContain("readme.md");
	});

	it("shows sort indicator with correct direction on active column", async () => {
		render(<FileList {...defaultProps} />);
		const nameHeader = screen.getByRole("button", { name: /name/i });
		expect(nameHeader.querySelector("svg")).not.toBeNull();
		expect(screen.getByTestId("sort-asc")).toBeInTheDocument();

		const sizeHeader = screen.getByRole("button", { name: /size/i });
		await userEvent.click(sizeHeader);
		expect(sizeHeader.querySelector("svg")).not.toBeNull();
		expect(screen.getByTestId("sort-asc")).toBeInTheDocument();
	});

	it("displays file sizes with correct formatting", () => {
		render(<FileList {...defaultProps} />);
		expect(screen.getByText("1.0 KB")).toBeInTheDocument();
		expect(screen.getByText("2.0 KB")).toBeInTheDocument();
	});

	it("does not show size for directories", () => {
		render(<FileList {...defaultProps} />);
		const cells = document.querySelectorAll('[class*="text-right"]');
		const dirCells = Array.from(cells).filter((_, i) => i < 2);
		for (const cell of dirCells) {
			expect(cell.textContent).toBe("");
		}
	});

	it("calls onSelectEntry on single click with modifier info", async () => {
		const onSelectEntry = vi.fn();
		const onEnterDirectory = vi.fn();
		render(<FileList {...defaultProps} onSelectEntry={onSelectEntry} onEnterDirectory={onEnterDirectory} />);
		await userEvent.click(screen.getByText("projects"));
		expect(onSelectEntry).toHaveBeenCalledWith("projects", false, false, ["documents", "projects", "config.json", "readme.md"]);
		expect(onEnterDirectory).not.toHaveBeenCalled();
	});

	it("calls onSelectEntry with ctrlKey true on Ctrl+click", async () => {
		const onSelectEntry = vi.fn();
		render(<FileList {...defaultProps} onSelectEntry={onSelectEntry} />);
		const user = userEvent.setup();
		await user.keyboard("{Control>}");
		await user.click(screen.getByText("projects"));
		await user.keyboard("{/Control}");
		expect(onSelectEntry).toHaveBeenCalledWith("projects", true, false, ["documents", "projects", "config.json", "readme.md"]);
	});

	it("calls onSelectEntry with shiftKey true on Shift+click", async () => {
		const onSelectEntry = vi.fn();
		render(<FileList {...defaultProps} onSelectEntry={onSelectEntry} />);
		const user = userEvent.setup();
		await user.keyboard("{Shift>}");
		await user.click(screen.getByText("config.json"));
		await user.keyboard("{/Shift}");
		expect(onSelectEntry).toHaveBeenCalledWith("config.json", false, true, ["documents", "projects", "config.json", "readme.md"]);
	});

	it("applies selection styling to entries in selectedNames", () => {
		render(<FileList {...defaultProps} selectedNames={["readme.md", "config.json"]} />);
		expect(screen.getByText("readme.md").closest(".cursor-pointer")?.className).toContain("bg-blue-200");
		expect(screen.getByText("config.json").closest(".cursor-pointer")?.className).toContain("bg-blue-200");
	});

	it("does not apply selection styling to entries not in selectedNames", () => {
		render(<FileList {...defaultProps} selectedNames={["readme.md"]} />);
		expect(screen.getByText("documents").closest(".cursor-pointer")?.className).not.toContain("bg-blue-200");
	});
});
