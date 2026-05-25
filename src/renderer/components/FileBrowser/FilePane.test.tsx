import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilePane } from "./FilePane";
import { useNavigationStore } from "../../store/navigation";
import { createMockApi } from "../../test/setup";

beforeAll(() => {
	class ResizeObserverMock {
		observe() { /* noop */ }
		unobserve() { /* noop */ }
		disconnect() { /* noop */ }
	}
	globalThis.ResizeObserver = ResizeObserverMock;
});

const mockApi = createMockApi({
	platform: "linux",
	filesystem: {
		list: vi.fn().mockResolvedValue([]),
		listDrives: vi.fn().mockResolvedValue(["/"]),
		homeDir: vi.fn().mockResolvedValue("/home/user"),
		pathExists: vi.fn().mockResolvedValue(true),
		getLastPath: vi.fn().mockResolvedValue(null),
		setLastPath: vi.fn().mockResolvedValue(undefined),
		remoteConnect: vi.fn().mockResolvedValue("/"),
		remoteDisconnect: vi.fn().mockResolvedValue(undefined),
		remoteList: vi.fn().mockResolvedValue([]),
		remoteHomeDir: vi.fn().mockResolvedValue("/"),
	},
});

vi.stubGlobal("api", mockApi);

function flushStore() {
	useNavigationStore.getState().clear("local");
	useNavigationStore.getState().clear("remote");
}

describe("FilePane", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		flushStore();
	});

	it("renders toolbar with back, forward, up and refresh buttons (local)", () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home/user" />
		);
		expect(screen.getByTitle("Back")).toBeInTheDocument();
		expect(screen.getByTitle("Forward")).toBeInTheDocument();
		expect(screen.getByTitle("Parent Directory")).toBeInTheDocument();
		expect(screen.getByTitle("Refresh")).toBeInTheDocument();
	});

	it("renders toolbar with back, forward, up and refresh buttons (remote)", () => {
		render(
			<FilePane type="remote" connectionId={1} initialPath="/" />
		);
		expect(screen.getByTitle("Back")).toBeInTheDocument();
		expect(screen.getByTitle("Forward")).toBeInTheDocument();
		expect(screen.getByTitle("Parent Directory")).toBeInTheDocument();
		expect(screen.getByTitle("Refresh")).toBeInTheDocument();
	});

	it("initializes navigation history with initialPath", () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home/user" />
		);
		const store = useNavigationStore.getState();
		expect(store.panes.local.entries).toEqual(["/home/user"]);
		expect(store.panes.local.index).toBe(0);
	});

	it("clears and re-initializes history on connection change", () => {
		const { rerender } = render(
			<FilePane type="local" connectionId={1} initialPath="/home/user" />
		);
		flushStore();
		rerender(
			<FilePane type="local" connectionId={2} initialPath="/var/log" />
		);
		const store = useNavigationStore.getState();
		expect(store.panes.local.entries).toEqual(["/var/log"]);
		expect(store.panes.local.index).toBe(0);
	});

	it("navigates back after entering a directory", async () => {
		const dirEntries = [
			{ name: "admin", isDirectory: true, size: 0, modified: "" },
		];
		window.api.filesystem.list = vi.fn().mockResolvedValue(dirEntries);

		render(
			<FilePane type="local" connectionId={1} initialPath="/home" />
		);

		const adminDir = await screen.findByText("admin");
		await userEvent.dblClick(adminDir);

		const store = useNavigationStore.getState();
		expect(store.panes.local.entries).toEqual(["/home", "/home/admin"]);
		expect(store.canGoBack("local")).toBe(true);

		await userEvent.click(screen.getByTitle("Back"));
		expect(useNavigationStore.getState().panes.local.index).toBe(0);
	});

	it("navigates forward after going back", async () => {
		const dirEntries = [
			{ name: "admin", isDirectory: true, size: 0, modified: "" },
		];
		window.api.filesystem.list = vi.fn().mockResolvedValue(dirEntries);

		render(
			<FilePane type="local" connectionId={1} initialPath="/home" />
		);

		const adminDir = await screen.findByText("admin");
		await userEvent.dblClick(adminDir);

		await userEvent.click(screen.getByTitle("Back"));

		const storeAfterBack = useNavigationStore.getState();
		expect(storeAfterBack.canGoForward("local")).toBe(true);

		await userEvent.click(screen.getByTitle("Forward"));
		expect(useNavigationStore.getState().panes.local.index).toBe(1);
	});

	it("back button is disabled with no history", () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home/user" />
		);
		expect(screen.getByTitle("Back")).toBeDisabled();
		expect(screen.getByTitle("Forward")).toBeDisabled();
	});

	it("calls goBack on mouse button 3 (back)", () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home" />
		);

		useNavigationStore.getState().push("local", "/home/user");
		useNavigationStore.getState().push("local", "/home/user/docs");

		const pane = document.querySelector(".flex-1.flex.flex-col.overflow-hidden");
		if (!pane) throw new Error("Pane element not found");
		const event = new MouseEvent("mousedown", { button: 3, bubbles: true, cancelable: true });
		pane.dispatchEvent(event);

		expect(useNavigationStore.getState().panes.local.index).toBe(1);
	});

	it("calls goForward on mouse button 4 (forward)", () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home" />
		);

		useNavigationStore.getState().push("local", "/home/user");
		useNavigationStore.getState().push("local", "/home/user/docs");
		useNavigationStore.getState().goBack("local");

		const pane = document.querySelector(".flex-1.flex.flex-col.overflow-hidden");
		if (!pane) throw new Error("Pane element not found");
		const event = new MouseEvent("mousedown", { button: 4, bubbles: true, cancelable: true });
		pane.dispatchEvent(event);

		expect(useNavigationStore.getState().panes.local.index).toBe(2);
	});

	it("does not navigate on regular mouse click (button 0)", () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home" />
		);

		useNavigationStore.getState().push("local", "/home/user");

		const pane = document.querySelector(".flex-1.flex.flex-col.overflow-hidden");
		if (!pane) throw new Error("Pane element not found");
		const event = new MouseEvent("mousedown", { button: 0, bubbles: true, cancelable: true });
		pane.dispatchEvent(event);

		expect(useNavigationStore.getState().panes.local.index).toBe(1);
	});

	it("loads remote directory using remoteList (not list)", async () => {
		const remoteEntries = [
			{ name: "var", isDirectory: true, size: 0, modified: "" },
			{ name: "etc", isDirectory: true, size: 0, modified: "" },
		];
		window.api.filesystem.remoteList = vi.fn().mockResolvedValue(remoteEntries);

		render(
			<FilePane type="remote" connectionId={5} initialPath="/" />
		);

		await screen.findByText("var");
		expect(window.api.filesystem.remoteList).toHaveBeenCalledWith(5, "/");
	});

	it("uses local IPC for local pane even when remoteList is available", async () => {
		const localEntries = [
			{ name: "docs", isDirectory: true, size: 0, modified: "" },
		];
		window.api.filesystem.list = vi.fn().mockResolvedValue(localEntries);
		window.api.filesystem.remoteList = vi.fn().mockResolvedValue([]);

		render(
			<FilePane type="local" connectionId={1} initialPath="/home" />
		);

		await screen.findByText("docs");
		expect(window.api.filesystem.list).toHaveBeenCalledWith("/home");
	});

	it("shows reconnect prompt when not connected error occurs", async () => {
		window.api.filesystem.remoteList = vi
			.fn()
			.mockRejectedValue(new Error("Not connected to remote server"));
		const onReconnect = vi.fn();

		render(
			<FilePane
				type="remote"
				connectionId={1}
				initialPath="/"
				onReconnect={onReconnect}
			/>
		);

		await screen.findByText("Reconnect");
		expect(screen.getByText("Reconnect")).toBeInTheDocument();
		expect(onReconnect).not.toHaveBeenCalled();

		await userEvent.click(screen.getByText("Reconnect"));
		expect(onReconnect).toHaveBeenCalled();
	});

	it("shows connection error overlay when connectionError prop is set", () => {
		const connectionError = {
			code: "CONNECTION_REFUSED" as const,
			technicalDetail: "connect ECONNREFUSED 192.168.1.1:22",
		};

		render(
			<FilePane
				type="remote"
				connectionId={1}
				initialPath="/"
				connectionError={connectionError}
				onReconnect={vi.fn()}
			/>
		);

		expect(screen.getByText("Reconnect")).toBeInTheDocument();
	});

	it("shows inline error with detail toggle when listing fails with permission denied", async () => {
		window.api.filesystem.remoteList = vi
			.fn()
			.mockRejectedValue(new Error("Permission denied"));

		render(
			<FilePane type="remote" connectionId={1} initialPath="/root" />
		);

		await screen.findByText("Show details");
		expect(screen.getByText("Permission denied")).toBeInTheDocument();

		await userEvent.click(screen.getByText("Show details"));

		expect(screen.getByText("Hide details")).toBeInTheDocument();
		expect(screen.getAllByText("Permission denied")).toHaveLength(2);
	});

	it("keeps toolbar functional when listing error occurs", async () => {
		window.api.filesystem.remoteList = vi
			.fn()
			.mockRejectedValue(new Error("Permission denied"));

		render(
			<FilePane type="remote" connectionId={1} initialPath="/root" />
		);

		await screen.findByText("Permission denied");

		expect(screen.getByTitle("Back")).toBeInTheDocument();
		expect(screen.getByTitle("Parent Directory")).toBeInTheDocument();
		expect(screen.getByTitle("Refresh")).toBeInTheDocument();
	});

	it("toggles error detail visibility", async () => {
		window.api.filesystem.remoteList = vi
			.fn()
			.mockRejectedValue(new Error("Permission denied"));

		render(
			<FilePane type="remote" connectionId={1} initialPath="/root" />
		);

		await screen.findByText("Show details");

		await userEvent.click(screen.getByText("Show details"));
		expect(screen.getByText("Hide details")).toBeInTheDocument();

		await userEvent.click(screen.getByText("Hide details"));
		expect(screen.getByText("Show details")).toBeInTheDocument();
	});
});
