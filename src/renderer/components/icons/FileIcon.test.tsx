import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FileIcon } from "./FileIcon";

describe("FileIcon", () => {
	beforeEach(() => {
		window.api.filesystem.getIcon = vi.fn().mockResolvedValue(null);
	});

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

	it("renders SVG icon when no filePath is provided", () => {
		render(<FileIcon path="app.ts" data-testid="file-icon" />);
		const el = screen.getByTestId("file-icon");
		expect(el.tagName).toBe("svg");
	});

	it("renders SVG icon when getIcon resolves null", async () => {
		window.api.filesystem.getIcon = vi.fn().mockResolvedValue(null);
		render(<FileIcon path="app.ts" filePath="/home/app.ts" data-testid="file-icon" />);
		await waitFor(() => {
			expect((screen.getByTestId("file-icon") as Element).tagName).toBe("svg");
		});
	});

	it("renders an img element when getIcon resolves a data URL", async () => {
		const dataUrl = "data:image/png;base64,abc123";
		window.api.filesystem.getIcon = vi.fn().mockResolvedValue(dataUrl);
		render(<FileIcon path="app.ts" filePath="/home/app.ts" data-testid="file-icon" />);
		await waitFor(() => {
			const img = screen.getByTestId("file-icon");
			expect(img.tagName).toBe("IMG");
			expect(img).toHaveAttribute("src", dataUrl);
		});
	});

	it("passes size to img when native icon is resolved", async () => {
		const dataUrl = "data:image/png;base64,abc123";
		window.api.filesystem.getIcon = vi.fn().mockResolvedValue(dataUrl);
		render(<FileIcon path="app.ts" filePath="/home/app.ts" size={16} data-testid="file-icon" />);
		await waitFor(() => {
			const img = screen.getByTestId("file-icon");
			expect(img).toHaveAttribute("width", "16");
			expect(img).toHaveAttribute("height", "16");
		});
	});
});
