import { describe, it, expect, vi, beforeEach } from "vitest";

import { join, parentPath } from "./path-utils";

vi.mock("../store/platform", () => ({
	usePlatformStore: {
		getState: vi.fn(),
	},
}));

import { usePlatformStore } from "@renderer/store/platform";

beforeEach(() => {
	vi.clearAllMocks();
});

describe("join", () => {
	it("joins paths with backslash on Windows", () => {
		vi.mocked(usePlatformStore.getState).mockReturnValue({
			platform: "win32",
			isWindows: true,
			isLinux: false,
			isMacOS: false,
			pathSep: "\\",
		});

		expect(join("C:\\Users", "Sergio")).toBe("C:\\Users\\Sergio");
		expect(join("C:\\", "Users")).toBe("C:\\Users");
		expect(join("C:\\Users\\", "Sergio")).toBe("C:\\Users\\Sergio");
	});

	it("joins paths with forward slash on Linux", () => {
		vi.mocked(usePlatformStore.getState).mockReturnValue({
			platform: "linux",
			isWindows: false,
			isLinux: true,
			isMacOS: false,
			pathSep: "/",
		});

		expect(join("/home", "user")).toBe("/home/user");
		expect(join("/", "home")).toBe("/home");
		expect(join("/home/", "user")).toBe("/home/user");
	});

	it("returns / when Linux result would be empty", () => {
		vi.mocked(usePlatformStore.getState).mockReturnValue({
			platform: "linux",
			isWindows: false,
			isLinux: true,
			isMacOS: false,
			pathSep: "/",
		});

		expect(join("", "")).toBe("/");
	});
});

describe("join with remote SFTP paths", () => {
	it("uses forward slashes for Unix-style paths even on Windows platform", () => {
		vi.mocked(usePlatformStore.getState).mockReturnValue({
			platform: "win32",
			isWindows: true,
			isLinux: false,
			isMacOS: false,
			pathSep: "\\",
		});

		expect(join("/home", "user")).toBe("/home/user");
		expect(join("/", "var")).toBe("/var");
		expect(join("/var", "log")).toBe("/var/log");
	});

	it("uses forward slashes for nested Unix-style paths on Windows", () => {
		vi.mocked(usePlatformStore.getState).mockReturnValue({
			platform: "win32",
			isWindows: true,
			isLinux: false,
			isMacOS: false,
			pathSep: "\\",
		});

		expect(join("/home/user", "docs")).toBe("/home/user/docs");
		expect(join("/home/user/", "downloads")).toBe("/home/user/downloads");
	});

	it("still uses backslashes for Windows drive paths on Windows platform", () => {
		vi.mocked(usePlatformStore.getState).mockReturnValue({
			platform: "win32",
			isWindows: true,
			isLinux: false,
			isMacOS: false,
			pathSep: "\\",
		});

		expect(join("C:\\Users", "Sergio")).toBe("C:\\Users\\Sergio");
		expect(join("C:\\", "Windows")).toBe("C:\\Windows");
	});
});

describe("parentPath", () => {
	it("returns parent directory on Windows", () => {
		expect(parentPath("C:\\Users\\Sergio")).toBe("C:\\Users");
		expect(parentPath("C:\\Users")).toBe("C:\\");
	});

	it("returns drive root as parent of top-level directory on Windows", () => {
		expect(parentPath("C:\\Users\\")).toBe("C:\\");
		expect(parentPath("C:\\Windows\\System32\\")).toBe("C:\\Windows");
	});

	it("returns null at drive root on Windows", () => {
		expect(parentPath("C:\\")).toBeNull();
		expect(parentPath("D:\\")).toBeNull();
	});

	it("returns parent directory on Unix", () => {
		expect(parentPath("/home/user")).toBe("/home");
		expect(parentPath("/home/user/")).toBe("/home");
	});

	it("returns null at root on Unix", () => {
		expect(parentPath("/")).toBeNull();
	});

	it("returns / as parent for top-level Unix directories", () => {
		expect(parentPath("/home")).toBe("/");
		expect(parentPath("/var")).toBe("/");
	});
});
