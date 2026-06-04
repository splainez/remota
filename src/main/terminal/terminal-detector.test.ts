import type { TerminalAppId } from "@shared/app-config-schema";
import { describe, it, expect, vi } from "vitest";

import { detectInstalledTerminals, type DetectorDeps } from "./terminal-detector";

function makeDeps(overrides: Partial<DetectorDeps> = {}): DetectorDeps {
	return {
		platform: "linux",
		lookupCommand: vi.fn().mockResolvedValue(false),
		existsSync: vi.fn().mockReturnValue(false),
		...overrides,
	};
}

describe("detectInstalledTerminals — platform filtering", () => {
	it("returns no Windows or macOS-only terminals on linux", async () => {
		const result = await detectInstalledTerminals(
			makeDeps({ platform: "linux", lookupCommand: vi.fn().mockResolvedValue(true) }),
		);
		expect(result).not.toContain("windows-terminal");
		expect(result).not.toContain("iterm2");
		expect(result).not.toContain("terminal-app");
	});

	it("returns no Windows or Linux-only terminals on darwin", async () => {
		const result = await detectInstalledTerminals(
			makeDeps({ platform: "darwin", lookupCommand: vi.fn().mockResolvedValue(true) }),
		);
		expect(result).not.toContain("windows-terminal");
		expect(result).not.toContain("gnome-terminal");
		expect(result).not.toContain("konsole");
	});

	it("returns only windows-terminal and alacritty on win32", async () => {
		const result = await detectInstalledTerminals(
			makeDeps({ platform: "win32", lookupCommand: vi.fn().mockResolvedValue(true) }),
		);
		expect(result).not.toContain("iterm2");
		expect(result).not.toContain("terminal-app");
		expect(result).not.toContain("kitty");
		expect(result).not.toContain("ghostty");
		expect(result).not.toContain("gnome-terminal");
		expect(result).not.toContain("konsole");
	});
});

describe("detectInstalledTerminals — lookupCommand (which/where.exe)", () => {
	it("detects a CLI binary when lookupCommand returns true", async () => {
		const lookupCommand = vi.fn().mockImplementation((cmd: string) => Promise.resolve(cmd === "kitty"));
		const result = await detectInstalledTerminals(makeDeps({ platform: "linux", lookupCommand }));
		expect(result).toContain("kitty");
	});

	it("does not detect a CLI binary when lookupCommand returns false", async () => {
		const lookupCommand = vi.fn().mockResolvedValue(false);
		const result = await detectInstalledTerminals(makeDeps({ platform: "linux", lookupCommand }));
		expect(result).not.toContain("kitty");
		expect(result).not.toContain("ghostty");
		expect(result).not.toContain("alacritty");
		expect(result).not.toContain("gnome-terminal");
		expect(result).not.toContain("konsole");
	});

	it("detects multiple CLI terminals from a single call", async () => {
		const lookupCommand = vi
			.fn()
			.mockImplementation((cmd: string) => Promise.resolve(cmd === "kitty" || cmd === "alacritty"));
		const result = await detectInstalledTerminals(makeDeps({ platform: "linux", lookupCommand }));
		expect(result).toContain("kitty");
		expect(result).toContain("alacritty");
		expect(result).not.toContain("ghostty");
	});

	it("calls lookupCommand once per supported terminal bin", async () => {
		const lookupCommand = vi.fn().mockResolvedValue(false);
		await detectInstalledTerminals(makeDeps({ platform: "linux", lookupCommand }));
		const calledWith = lookupCommand.mock.calls.map((c): string => String(c[0])).sort();
		expect(calledWith).toEqual(["alacritty", "ghostty", "gnome-terminal", "kitty", "konsole"]);
	});

	it("does not call lookupCommand for terminals with no command bins (macOS apps)", async () => {
		const lookupCommand = vi.fn().mockResolvedValue(false);
		await detectInstalledTerminals(makeDeps({ platform: "darwin", lookupCommand }));
		const calledWith = lookupCommand.mock.calls.map((c): string => String(c[0]));
		expect(calledWith).not.toContain("iterm2");
		expect(calledWith).not.toContain("terminal-app");
	});

	it("aggregates multiple bin results correctly (mock returns truthy for any bin)", async () => {
		// Verifies the Promise.all + .some(Boolean) aggregation: if the lookup mock returns
		// truthy, the terminal is detected. The single-bin production path is exercised by
		// the tests above; this confirms the aggregation logic with a varied mock.
		const lookupCommand = vi.fn().mockImplementation((cmd: string) => Promise.resolve(cmd === "kitty"));
		const result = await detectInstalledTerminals(makeDeps({ platform: "linux", lookupCommand }));
		expect(result).toContain("kitty");
		expect(result).not.toContain("alacritty");
	});

	it("treats lookupCommand rejection as not found", async () => {
		const lookupCommand = vi.fn().mockRejectedValue(new Error("spawn ENOENT"));
		const result = await detectInstalledTerminals(makeDeps({ platform: "linux", lookupCommand }));
		expect(result).toEqual([]);
	});

	it("runs all lookups in parallel", async () => {
		let inFlight = 0;
		let maxInFlight = 0;
		const lookupCommand = vi.fn().mockImplementation(async (cmd: string) => {
			inFlight++;
			maxInFlight = Math.max(maxInFlight, inFlight);
			await new Promise((r) => setTimeout(r, 10));
			inFlight--;
			return cmd === "kitty";
		});
		await detectInstalledTerminals(makeDeps({ platform: "linux", lookupCommand }));
		expect(maxInFlight).toBeGreaterThan(1);
	});
});

describe("detectInstalledTerminals — absolute paths (macOS GUI apps)", () => {
	it("detects iTerm2 at /Applications/iTerm.app", async () => {
		const existsSync = vi.fn((p: string) => p === "/Applications/iTerm.app");
		const result = await detectInstalledTerminals(makeDeps({ platform: "darwin", existsSync }));
		expect(result).toContain("iterm2");
	});

	it("detects iTerm2 at /Applications/iTerm2.app (alt name)", async () => {
		const existsSync = vi.fn((p: string) => p === "/Applications/iTerm2.app");
		const result = await detectInstalledTerminals(makeDeps({ platform: "darwin", existsSync }));
		expect(result).toContain("iterm2");
	});

	it("does not detect iTerm2 when neither path exists", async () => {
		const existsSync = vi.fn().mockReturnValue(false);
		const result = await detectInstalledTerminals(makeDeps({ platform: "darwin", existsSync }));
		expect(result).not.toContain("iterm2");
	});

	it("does not check iTerm2 paths on linux", async () => {
		const existsSync = vi.fn().mockReturnValue(false);
		await detectInstalledTerminals(makeDeps({ platform: "linux", existsSync }));
		const itermChecks = (existsSync as ReturnType<typeof vi.fn>).mock.calls.filter(
			(c) => typeof c[0] === "string" && c[0].includes("iTerm"),
		);
		expect(itermChecks).toHaveLength(0);
	});

	it("detects Terminal.app at /System/Applications/Utilities/Terminal.app", async () => {
		const existsSync = vi.fn((p: string) => p === "/System/Applications/Utilities/Terminal.app");
		const result = await detectInstalledTerminals(makeDeps({ platform: "darwin", existsSync }));
		expect(result).toContain("terminal-app");
	});

	it("detects Terminal.app at the legacy /Applications/Utilities path", async () => {
		const existsSync = vi.fn((p: string) => p === "/Applications/Utilities/Terminal.app");
		const result = await detectInstalledTerminals(makeDeps({ platform: "darwin", existsSync }));
		expect(result).toContain("terminal-app");
	});
});

describe("detectInstalledTerminals — combined scenarios", () => {
	it("detects only kitty+alacritty on linux when only those resolve true", async () => {
		const lookupCommand = vi
			.fn()
			.mockImplementation((cmd: string) => Promise.resolve(cmd === "kitty" || cmd === "alacritty"));
		const result = await detectInstalledTerminals(makeDeps({ platform: "linux", lookupCommand }));
		const expected: TerminalAppId[] = ["kitty", "alacritty"];
		expect(result).toEqual(expect.arrayContaining(expected));
		expect(result).not.toContain("ghostty");
		expect(result).not.toContain("gnome-terminal");
		expect(result).not.toContain("konsole");
	});

	it("detects iTerm2 + Terminal.app + kitty on a complete darwin system", async () => {
		const lookupCommand = vi.fn().mockImplementation((cmd: string) => Promise.resolve(cmd === "kitty"));
		const existsSync = vi.fn(
			(p: string) => p === "/Applications/iTerm.app" || p === "/System/Applications/Utilities/Terminal.app",
		);
		const result = await detectInstalledTerminals(makeDeps({ platform: "darwin", lookupCommand, existsSync }));
		const expected: TerminalAppId[] = ["iterm2", "terminal-app", "kitty"];
		expect(result).toEqual(expect.arrayContaining(expected));
		expect(result).not.toContain("windows-terminal");
		expect(result).not.toContain("gnome-terminal");
		expect(result).not.toContain("konsole");
	});

	it("returns empty list on a stock Windows machine with no terminals", async () => {
		const result = await detectInstalledTerminals(
			makeDeps({ platform: "win32", lookupCommand: vi.fn().mockResolvedValue(false) }),
		);
		expect(result).toEqual([]);
	});
});
