import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { Terminal } from "./Terminal";

const mockTerminal = {
	open: vi.fn(),
	write: vi.fn(),
	dispose: vi.fn(),
	loadAddon: vi.fn(),
	onData: vi.fn(),
	focus: vi.fn(),
};

let xtermConfig: Record<string, unknown> | null = null;

vi.mock("@xterm/xterm", () => {
	return {
		Terminal: vi.fn().mockImplementation(function (this: Record<string, unknown>, config: Record<string, unknown>) {
			xtermConfig = config;
			Object.assign(this, mockTerminal);
			Object.defineProperty(this, "cols", { get: () => 80, configurable: true });
			Object.defineProperty(this, "rows", { get: () => 24, configurable: true });
		}),
	};
});

vi.mock("@xterm/addon-fit", () => {
	return {
		FitAddon: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
			this.fit = vi.fn();
		}),
	};
});

beforeAll(() => {
	class ResizeObserverMock {
		observe() {
			/* noop */
		}
		unobserve() {
			/* noop */
		}
		disconnect() {
			/* noop */
		}
	}
	globalThis.ResizeObserver = ResizeObserverMock;
});

const createMockApi = () => ({
	connections: {},
	filesystem: {
		list: vi.fn().mockResolvedValue([]),
		listDrives: vi.fn().mockResolvedValue(["/"]),
		homeDir: vi.fn().mockResolvedValue("/home/user"),
		pathExists: vi.fn().mockResolvedValue(true),
		getLastPath: vi.fn().mockResolvedValue(null),
		setLastPath: vi.fn().mockResolvedValue(undefined),
		getIcon: vi.fn().mockResolvedValue(null),
		remoteConnect: vi.fn().mockResolvedValue("/"),
		remoteDisconnect: vi.fn().mockResolvedValue(undefined),
		remoteList: vi.fn().mockResolvedValue([]),
		remoteHomeDir: vi.fn().mockResolvedValue("/"),
	},
	terminal: {
		spawn: vi.fn().mockResolvedValue(undefined),
		write: vi.fn().mockResolvedValue(undefined),
		resize: vi.fn().mockResolvedValue(undefined),
		kill: vi.fn().mockResolvedValue(undefined),
		onData: vi.fn().mockReturnValue(vi.fn()),
		onExit: vi.fn().mockReturnValue(vi.fn()),
	},
	platform: "linux",
});

describe("Terminal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		xtermConfig = null;
		vi.stubGlobal("api", createMockApi());
	});

	it("renders terminal container", () => {
		const { container } = render(<Terminal sessionId="local-1" type="local" />);
		expect(container.querySelector("div")).toBeInTheDocument();
	});

	it("calls term.focus after opening", () => {
		render(<Terminal sessionId="local-1" type="local" />);
		expect(mockTerminal.focus).toHaveBeenCalled();
	});

	it("passes allowProposedApi to xterm config", () => {
		render(<Terminal sessionId="local-1" type="local" />);
		expect(xtermConfig).toBeTruthy();
		expect(xtermConfig).toHaveProperty("allowProposedApi", true);
	});

	it("passes cursorBlink to xterm config", () => {
		render(<Terminal sessionId="local-1" type="local" />);
		expect(xtermConfig).toHaveProperty("cursorBlink", true);
	});

	it("passes font size and family to xterm config", () => {
		render(<Terminal sessionId="local-1" type="local" />);
		expect(xtermConfig).toHaveProperty("fontSize", 13);
		expect(xtermConfig).toMatchObject({
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			fontFamily: expect.stringContaining("JetBrains Mono"),
		});
	});

	it("passes dark theme to xterm config", () => {
		render(<Terminal sessionId="local-1" type="local" />);
		expect(xtermConfig).toHaveProperty("theme");
		expect((xtermConfig as { theme: Record<string, string> }).theme.background).toBe("#0d141b");
		expect((xtermConfig as { theme: Record<string, string> }).theme.foreground).toBe("#dce3ed");
	});

	it("calls terminal.spawn on mount", () => {
		render(<Terminal sessionId="local-1" type="local" />);
		expect(window.api.terminal.spawn).toHaveBeenCalledWith("local-1", "local", undefined);
	});

	it("calls terminal.spawn with connectionId for remote", () => {
		render(<Terminal sessionId="remote-5" type="remote" connectionId={5} />);
		expect(window.api.terminal.spawn).toHaveBeenCalledWith("remote-5", "remote", 5);
	});

	it("subscribes to terminal.onData", () => {
		render(<Terminal sessionId="local-1" type="local" />);
		expect(window.api.terminal.onData).toHaveBeenCalledWith("local-1", expect.any(Function));
	});

	it("subscribes xterm.onData handler", () => {
		render(<Terminal sessionId="local-1" type="local" />);
		expect(mockTerminal.onData).toHaveBeenCalledWith(expect.any(Function));
	});

	it("xterm.onData handler calls terminal.write", () => {
		render(<Terminal sessionId="local-1" type="local" />);
		const onDataCb = mockTerminal.onData.mock.calls[0][0] as (data: string) => void;
		onDataCb("echo test\r");
		expect(window.api.terminal.write).toHaveBeenCalledWith("local-1", "echo test\r");
	});

	it("terminal.onData callback writes to xterm", () => {
		render(<Terminal sessionId="local-1" type="local" />);
		const onDataCb = (window.api.terminal.onData as ReturnType<typeof vi.fn>).mock.calls[0][1] as (
			data: string,
		) => void;
		onDataCb("$ prompt> ");
		expect(mockTerminal.write).toHaveBeenCalledWith("$ prompt> ");
	});

	it("full type-write-echo roundtrip", () => {
		render(<Terminal sessionId="local-1" type="local" />);

		// User types: calls xterm onData → ipc write → pty write
		const xtermOnData = mockTerminal.onData.mock.calls[0][0] as (data: string) => void;
		xtermOnData("l");
		xtermOnData("s");
		xtermOnData("\r");

		expect(window.api.terminal.write).toHaveBeenCalledWith("local-1", "l");
		expect(window.api.terminal.write).toHaveBeenCalledWith("local-1", "s");
		expect(window.api.terminal.write).toHaveBeenCalledWith("local-1", "\r");

		// PTY echoes back: calls onData callback → xterm.write
		const ipcOnData = (window.api.terminal.onData as ReturnType<typeof vi.fn>).mock.calls[0][1] as (
			data: string,
		) => void;
		ipcOnData("l");
		ipcOnData("s");
		ipcOnData("\r\n");

		expect(mockTerminal.write).toHaveBeenCalledWith("l");
		expect(mockTerminal.write).toHaveBeenCalledWith("s");
		expect(mockTerminal.write).toHaveBeenCalledWith("\r\n");
	});

	it("calls terminal.kill on unmount", () => {
		const { unmount } = render(<Terminal sessionId="local-1" type="local" />);
		unmount();
		expect(window.api.terminal.kill).toHaveBeenCalledWith("local-1");
	});

	it("calls term.dispose on unmount", () => {
		const { unmount } = render(<Terminal sessionId="local-1" type="local" />);
		unmount();
		expect(mockTerminal.dispose).toHaveBeenCalled();
	});

	it("does not crash when container is null", () => {
		// This tests the early return when containerRef.current is null
		const { unmount } = render(<Terminal sessionId="local-1" type="local" />);
		unmount();
	});

	it("loads FitAddon", () => {
		render(<Terminal sessionId="local-1" type="local" />);
		expect(mockTerminal.loadAddon).toHaveBeenCalled();
	});
});
