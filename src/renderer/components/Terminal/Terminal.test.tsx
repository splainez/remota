import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { Terminal } from "./Terminal";

vi.mock("@xterm/xterm", () => {
	return {
		Terminal: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
			this.open = vi.fn();
			this.write = vi.fn();
			this.dispose = vi.fn();
			this.loadAddon = vi.fn();
			this.onData = vi.fn();
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
		observe() { /* noop */ }
		unobserve() { /* noop */ }
		disconnect() { /* noop */ }
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
		vi.stubGlobal("api", createMockApi());
	});

	it("renders terminal container", () => {
		const { container } = render(
			<Terminal sessionId="local-1" type="local" />,
		);
		expect(container.querySelector("div")).toBeInTheDocument();
	});

	it("calls terminal.spawn on mount", () => {
		render(<Terminal sessionId="local-1" type="local" />);
		expect(window.api.terminal.spawn).toHaveBeenCalledWith("local-1", "local", undefined);
	});

	it("calls terminal.spawn with connectionId for remote", () => {
		render(<Terminal sessionId="remote-5" type="remote" connectionId={5} />);
		expect(window.api.terminal.spawn).toHaveBeenCalledWith("remote-5", "remote", 5);
	});

	it("calls terminal.kill on unmount", () => {
		const { unmount } = render(<Terminal sessionId="local-1" type="local" />);
		unmount();
		expect(window.api.terminal.kill).toHaveBeenCalledWith("local-1");
	});

	it("subscribes to terminal.onData", () => {
		render(<Terminal sessionId="local-1" type="local" />);
		expect(window.api.terminal.onData).toHaveBeenCalledWith("local-1", expect.any(Function));
	});
});
