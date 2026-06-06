import type { AppStore } from "@main/app-store";
import { describe, it, expect, vi } from "vitest";

vi.mock("electron", () => ({
	app: {},
	ipcMain: { handle: vi.fn() },
	shell: { openPath: vi.fn().mockResolvedValue("") },
}));

// eslint-disable-next-line @typescript-eslint/unbound-method -- ipcMain.handle is mocked via vi.fn()
const mockHandle = (await import("electron")).ipcMain.handle as unknown as ReturnType<typeof vi.fn>;

const { registerFilesystemHandlers } = await import("./filesystem");

describe("FILE_RENAME handler", () => {
	it("registers the FILE_RENAME channel", () => {
		registerFilesystemHandlers({} as AppStore);
		const calls = mockHandle.mock.calls as [string, unknown][];
		const channels = calls.map((c) => c[0]);
		expect(channels).toContain("file:rename");
	});
});
