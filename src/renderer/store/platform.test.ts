import { describe, it, expect, vi, beforeEach } from "vitest";

describe("usePlatformStore", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.unstubAllGlobals();
	});

	it("detects Windows (win32)", async () => {
		vi.stubGlobal("api", { platform: "win32" });
		const { usePlatformStore } = await import("./platform");
		const state = usePlatformStore.getState();
		expect(state.platform).toBe("win32");
		expect(state.isWindows).toBe(true);
		expect(state.isLinux).toBe(false);
		expect(state.isMacOS).toBe(false);
		expect(state.pathSep).toBe("\\");
	});

	it("detects Linux", async () => {
		vi.stubGlobal("api", { platform: "linux" });
		const { usePlatformStore } = await import("./platform");
		const state = usePlatformStore.getState();
		expect(state.platform).toBe("linux");
		expect(state.isLinux).toBe(true);
		expect(state.isWindows).toBe(false);
		expect(state.pathSep).toBe("/");
	});

	it("detects macOS (darwin)", async () => {
		vi.stubGlobal("api", { platform: "darwin" });
		const { usePlatformStore } = await import("./platform");
		const state = usePlatformStore.getState();
		expect(state.platform).toBe("darwin");
		expect(state.isMacOS).toBe(true);
		expect(state.isWindows).toBe(false);
		expect(state.pathSep).toBe("/");
	});

	it("defaults to linux when window.api is not available", async () => {
		const { usePlatformStore } = await import("./platform");
		const state = usePlatformStore.getState();
		expect(state.isLinux).toBe(true);
	});
});
