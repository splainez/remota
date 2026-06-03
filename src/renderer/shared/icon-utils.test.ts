import { describe, it, expect } from "vitest";

import { getFileIcon, getFolderIcon } from "./icon-utils";

describe("getFileIcon", () => {
	it('returns "file-code" for .ts files', () => {
		expect(getFileIcon("src/app.ts")).toBe("file-code");
	});

	it('returns "file-code" for .tsx files', () => {
		expect(getFileIcon("Component.tsx")).toBe("file-code");
	});

	it('returns "file-code" for .js files', () => {
		expect(getFileIcon("index.js")).toBe("file-code");
	});

	it('returns "package" for package.json', () => {
		expect(getFileIcon("package.json")).toBe("package");
	});

	it('returns "json" for other .json files', () => {
		expect(getFileIcon("config.json")).toBe("json");
	});

	it('returns "markdown" for .md files', () => {
		expect(getFileIcon("README.md")).toBe("markdown");
	});

	it('returns "file-media" for .png files', () => {
		expect(getFileIcon("image.png")).toBe("file-media");
	});

	it('returns "file-media" for .jpg files', () => {
		expect(getFileIcon("photo.jpg")).toBe("file-media");
	});

	it('returns "file-pdf" for .pdf files', () => {
		expect(getFileIcon("doc.pdf")).toBe("file-pdf");
	});

	it('returns "file-zip" for .zip files', () => {
		expect(getFileIcon("archive.zip")).toBe("file-zip");
	});

	it('returns "file-binary" for .exe files', () => {
		expect(getFileIcon("app.exe")).toBe("file-binary");
	});

	it('returns "file-code" for .html files', () => {
		expect(getFileIcon("index.html")).toBe("file-code");
	});

	it('returns "file" for files with unknown extension', () => {
		expect(getFileIcon("data.xyz")).toBe("file");
	});

	it('returns "file" for files with no extension', () => {
		expect(getFileIcon("Makefile")).toBe("file");
	});

	it("handles Windows-style paths", () => {
		expect(getFileIcon("C:\\Users\\app.ts")).toBe("file-code");
	});

	it("handles nested paths", () => {
		expect(getFileIcon("/home/user/src/components/Button.tsx")).toBe("file-code");
	});

	it('returns "package" for package.json', () => {
		expect(getFileIcon("package.json")).toBe("package");
	});

	it('returns "file-code" for .yaml files', () => {
		expect(getFileIcon("config.yaml")).toBe("file-code");
	});

	it('returns "file-code" for .sh files', () => {
		expect(getFileIcon("script.sh")).toBe("file-code");
	});
});

describe("getFolderIcon", () => {
	it('returns "folder" for regular folders', () => {
		expect(getFolderIcon("src")).toBe("folder");
		expect(getFolderIcon("components")).toBe("folder");
	});

	it('returns "folder-library" for node_modules', () => {
		expect(getFolderIcon("node_modules")).toBe("folder-library");
		expect(getFolderIcon("/project/node_modules")).toBe("folder-library");
	});

	it('returns "folder" for .git', () => {
		expect(getFolderIcon(".git")).toBe("folder");
	});

	it('returns "folder" for generic nested folders', () => {
		expect(getFolderIcon("/home/user/projects/my-app")).toBe("folder");
	});

	it("handles Windows-style paths", () => {
		expect(getFolderIcon("C:\\project\\node_modules")).toBe("folder-library");
	});

	it('returns "folder" for empty path', () => {
		expect(getFolderIcon("")).toBe("folder");
	});
});
