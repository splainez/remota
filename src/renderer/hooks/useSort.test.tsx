import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { useSort, createSortIndicator } from "./useSort";

interface Item {
	name: string;
	size: number;
}

function compare(a: Item, b: Item, key: string): number {
	if (key === "name") return a.name.localeCompare(b.name);
	if (key === "size") return a.size - b.size;
	return 0;
}

function dirsFirst(items: Item[]): { head: Item[]; tail: Item[] } {
	const dirs = items.filter((i) => i.name.startsWith("dir"));
	const files = items.filter((i) => !i.name.startsWith("dir"));
	return { head: dirs, tail: files };
}

describe("useSort", () => {
	const items: Item[] = [
		{ name: "dir_projects", size: 0 },
		{ name: "file_a.txt", size: 100 },
		{ name: "dir_docs", size: 0 },
		{ name: "file_z.txt", size: 500 },
	];

	it("starts sorted by initialKey ascending", () => {
		const { result } = renderHook(() =>
			useSort({ items, initialKey: "name", compare }),
		);
		expect(result.current.sorted.map((i) => i.name)).toEqual([
			"dir_docs",
			"dir_projects",
			"file_a.txt",
			"file_z.txt",
		]);
		expect(result.current.config.direction).toBe("asc");
	});

	it("toggles to descending on first handleSort of same key", () => {
		const { result } = renderHook(() =>
			useSort({ items, initialKey: "name", compare }),
		);
		act(() => {
			result.current.handleSort("name");
		});
		expect(result.current.config.direction).toBe("desc");
		expect(result.current.sorted.map((i) => i.name)).toEqual([
			"file_z.txt",
			"file_a.txt",
			"dir_projects",
			"dir_docs",
		]);
	});

	it("toggles back to ascending on second handleSort of same key", () => {
		const { result } = renderHook(() =>
			useSort({ items, initialKey: "name", compare }),
		);
		act(() => {
			result.current.handleSort("name");
		});
		act(() => {
			result.current.handleSort("name");
		});
		expect(result.current.config.direction).toBe("asc");
	});

	it("resets direction to asc when switching keys", () => {
		const { result } = renderHook(() =>
			useSort({ items, initialKey: "name", compare, initialDir: "desc" }),
		);
		act(() => {
			result.current.handleSort("size");
		});
		expect(result.current.config.direction).toBe("asc");
		expect(result.current.config.key).toBe("size");
	});

	it("uses partition function when provided", () => {
		const { result } = renderHook(() =>
			useSort({ items, initialKey: "name", compare, partition: dirsFirst, initialDir: "asc" }),
		);
		expect(result.current.sorted.map((i) => i.name)).toEqual([
			"dir_docs",
			"dir_projects",
			"file_a.txt",
			"file_z.txt",
		]);
	});

	it("partition keeps dirs first even with size sort", () => {
		const sortedItems: Item[] = [
			{ name: "dir_projects", size: 0 },
			{ name: "file_b.txt", size: 300 },
			{ name: "dir_docs", size: 0 },
			{ name: "file_a.txt", size: 100 },
		];
		const { result } = renderHook(() =>
			useSort({ items: sortedItems, initialKey: "size", compare, partition: dirsFirst }),
		);
		const names = result.current.sorted.map((i) => i.name);
		expect(names[0]).toMatch(/^dir_/);
		expect(names[1]).toMatch(/^dir_/);
		expect(names[2]).toBe("file_a.txt");
		expect(names[3]).toBe("file_b.txt");
	});

	it("supports descending partition sort", () => {
		const { result } = renderHook(() =>
			useSort({ items, initialKey: "name", compare, partition: dirsFirst, initialDir: "desc" }),
		);
		const names = result.current.sorted.map((i) => i.name);
		expect(names[0]).toBe("dir_projects");
		expect(names[1]).toBe("dir_docs");
	});

	it("exposes setKey and setDir", () => {
		const { result } = renderHook(() =>
			useSort({ items, initialKey: "name", compare }),
		);
		act(() => {
			result.current.setKey("size");
			result.current.setDir("desc");
		});
		expect(result.current.config.key).toBe("size");
		expect(result.current.config.direction).toBe("desc");
	});
});

describe("createSortIndicator", () => {
	const ascIcon = React.createElement("span", { "data-testid": "asc" });
	const descIcon = React.createElement("span", { "data-testid": "desc" });

	it("returns null when keys do not match", () => {
		expect(createSortIndicator("name", "size", "asc", ascIcon, descIcon)).toBeNull();
	});

	it("returns asc icon when direction is asc and keys match", () => {
		const result = createSortIndicator("name", "name", "asc", ascIcon, descIcon);
		expect(result).not.toBeNull();
	});

	it("returns desc icon when direction is desc and keys match", () => {
		const result = createSortIndicator("name", "name", "desc", ascIcon, descIcon);
		expect(result).not.toBeNull();
	});
});
