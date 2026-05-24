import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FolderIcon } from "./FolderIcon";

describe("FolderIcon", () => {
	it("renders a folder icon for a regular folder", () => {
		render(<FolderIcon path="src/components" data-testid="folder-icon" />);
		expect(screen.getByTestId("folder-icon")).toBeInTheDocument();
	});

	it("renders a folder icon for a nested folder", () => {
		render(<FolderIcon path="/home/user/projects" data-testid="folder-icon" />);
		expect(screen.getByTestId("folder-icon")).toBeInTheDocument();
	});

	it("renders a folder-library icon for node_modules", () => {
		render(<FolderIcon path="/project/node_modules" data-testid="folder-icon" />);
		expect(screen.getByTestId("folder-icon")).toBeInTheDocument();
	});

	it("renders a folder icon for .git", () => {
		render(<FolderIcon path="/project/.git" data-testid="folder-icon" />);
		expect(screen.getByTestId("folder-icon")).toBeInTheDocument();
	});

	it("renders with custom size", () => {
		render(<FolderIcon path="src" size={24} data-testid="folder-icon" />);
		expect(screen.getByTestId("folder-icon")).toBeInTheDocument();
	});
});
