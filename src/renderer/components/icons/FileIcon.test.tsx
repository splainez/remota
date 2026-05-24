import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileIcon } from "./FileIcon";

describe("FileIcon", () => {
	it("renders an icon for a TypeScript file", () => {
		render(<FileIcon path="src/app.ts" data-testid="file-icon" />);
		expect(screen.getByTestId("file-icon")).toBeInTheDocument();
	});

	it("renders an icon for a JavaScript file", () => {
		render(<FileIcon path="index.js" data-testid="file-icon" />);
		expect(screen.getByTestId("file-icon")).toBeInTheDocument();
	});

	it("renders an icon for a JSON file", () => {
		render(<FileIcon path="package.json" data-testid="file-icon" />);
		expect(screen.getByTestId("file-icon")).toBeInTheDocument();
	});

	it("renders an icon for a Markdown file", () => {
		render(<FileIcon path="readme.md" data-testid="file-icon" />);
		expect(screen.getByTestId("file-icon")).toBeInTheDocument();
	});

	it("renders an icon for a CSS file", () => {
		render(<FileIcon path="styles/app.css" data-testid="file-icon" />);
		expect(screen.getByTestId("file-icon")).toBeInTheDocument();
	});

	it("renders an icon for a PDF file", () => {
		render(<FileIcon path="report.pdf" data-testid="file-icon" />);
		expect(screen.getByTestId("file-icon")).toBeInTheDocument();
	});

	it("renders an icon for a ZIP file", () => {
		render(<FileIcon path="archive.zip" data-testid="file-icon" />);
		expect(screen.getByTestId("file-icon")).toBeInTheDocument();
	});

	it("renders a default icon for unknown extension", () => {
		render(<FileIcon path="unknown.xyz" data-testid="file-icon" />);
		expect(screen.getByTestId("file-icon")).toBeInTheDocument();
	});

	it("renders an icon for a file without extension", () => {
		render(<FileIcon path="Makefile" data-testid="file-icon" />);
		expect(screen.getByTestId("file-icon")).toBeInTheDocument();
	});

	it("renders with custom size", () => {
		render(<FileIcon path="app.ts" size={20} data-testid="file-icon" />);
		expect(screen.getByTestId("file-icon")).toBeInTheDocument();
	});
});
