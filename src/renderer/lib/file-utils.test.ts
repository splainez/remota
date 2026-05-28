import { describe, it, expect, vi, afterEach } from "vitest";
import { formatSize, formatDate } from "./file-utils";

describe("formatSize", () => {
	it("returns empty string for 0 bytes", () => {
		expect(formatSize(0)).toBe("");
	});

	it("formats bytes", () => {
		expect(formatSize(500)).toBe("500 B");
	});

	it("formats KB", () => {
		expect(formatSize(1500)).toBe("1.5 KB");
	});

	it("formats MB", () => {
		expect(formatSize(5 * 1024 * 1024)).toBe("5.0 MB");
	});

	it("formats GB", () => {
		expect(formatSize(3.5 * 1024 * 1024 * 1024)).toBe("3.5 GB");
	});
});

describe("formatDate", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns empty string for empty input", () => {
		expect(formatDate("")).toBe("");
	});

	it('returns "Just now" for less than a minute ago', () => {
		const d = new Date(Date.now() - 30 * 1000);
		expect(formatDate(d.toISOString())).toBe("Just now");
	});

	it("formats minutes ago", () => {
		const d = new Date(Date.now() - 5 * 60 * 1000);
		expect(formatDate(d.toISOString())).toBe("5 min ago");
	});

	it("formats hours as HH:MM", () => {
		const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
		const result = formatDate(d.toISOString());
		expect(result).toMatch(/^\d{2}:\d{2}$/);
	});

	it('returns "Yesterday" for 1 day ago', () => {
		const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
		expect(formatDate(d.toISOString())).toBe("Yesterday");
	});

	it('returns "X days ago" for less than a week', () => {
		const d = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
		expect(formatDate(d.toISOString())).toBe("3 days ago");
	});

	it("formats older dates as YYYY-MM-DD", () => {
		const d = new Date(2024, 0, 15);
		expect(formatDate(d.toISOString())).toBe("2024-01-15");
	});
});
