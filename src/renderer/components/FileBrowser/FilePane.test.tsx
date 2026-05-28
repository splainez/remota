import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilePane } from "./FilePane";
import { useNavigationStore } from "../../store/navigation";
import { usePlatformStore } from "../../store/platform";
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
		getIcon: vi.fn<() => Promise<string | null>>().mockResolvedValue(null),
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

const selectionEntries = [
	{ name: "backups", isDirectory: true, size: 0, modified: "" },
	{ name: "projects", isDirectory: true, size: 0, modified: "" },
	{ name: "config.json", isDirectory: false, size: 200, modified: "" },
	{ name: "notes.txt", isDirectory: false, size: 50, modified: "" },
];

const selectionEntriesWithWebapp = [
	...selectionEntries,
	{ name: "webapp", isDirectory: false, size: 300, modified: "" },
];

const waitForEntries = async () => {
	await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());
};

describe("FilePane", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		flushStore();
	});

	it("renders toolbar with up, refresh and new folder buttons (local)", () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home/user" />
		);
		expect(screen.getByTitle("Parent Directory")).toBeInTheDocument();
		expect(screen.getByTitle("Refresh")).toBeInTheDocument();
		expect(screen.getByTitle("New Folder")).toBeInTheDocument();
	});

	it("renders toolbar with up, refresh and new folder buttons (remote)", () => {
		render(
			<FilePane type="remote" connectionId={1} initialPath="/" />
		);
		expect(screen.getByTitle("Parent Directory")).toBeInTheDocument();
		expect(screen.getByTitle("Refresh")).toBeInTheDocument();
		expect(screen.getByTitle("New Folder")).toBeInTheDocument();
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

		const pane = document.querySelector(".flex-1.flex.flex-col.overflow-hidden");
		if (!pane) throw new Error("Pane element not found");
		const event = new MouseEvent("mousedown", { button: 3, bubbles: true, cancelable: true });
		pane.dispatchEvent(event);

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

		const pane = document.querySelector(".flex-1.flex.flex-col.overflow-hidden");
		if (!pane) throw new Error("Pane element not found");
		pane.dispatchEvent(new MouseEvent("mousedown", { button: 3, bubbles: true, cancelable: true }));

		const storeAfterBack = useNavigationStore.getState();
		expect(storeAfterBack.canGoForward("local")).toBe(true);

		pane.dispatchEvent(new MouseEvent("mousedown", { button: 4, bubbles: true, cancelable: true }));
		expect(useNavigationStore.getState().panes.local.index).toBe(1);
	});

	it("back and forward are not available as buttons", () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home/user" />
		);
		expect(screen.queryByTitle("Back")).not.toBeInTheDocument();
		expect(screen.queryByTitle("Forward")).not.toBeInTheDocument();
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

	// --- selection ---

	it("selects an entry on single click", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(selectionEntries);

		render(
			<FilePane type="local" connectionId={1} initialPath="/home/admin" />
		);
		await waitForEntries();

		await userEvent.click(screen.getByText("projects"));
		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");
		expect(screen.getByText("backups").closest(".cursor-pointer")?.className).not.toContain("bg-primary-fixed-dim/20");
	});

	it("clears previous selection on plain click", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(selectionEntries);

		render(
			<FilePane type="local" connectionId={1} initialPath="/home/admin" />
		);
		await waitForEntries();
		const user = userEvent.setup();

		await user.click(screen.getByText("projects"));
		await user.keyboard("{Control>}");
		await user.click(screen.getByText("backups"));
		await user.keyboard("{/Control}");
		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");
		expect(screen.getByText("backups").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");

		await user.click(screen.getByText("notes.txt"));
		expect(screen.getByText("notes.txt").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");
		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).not.toContain("bg-primary-fixed-dim/20");
		expect(screen.getByText("backups").closest(".cursor-pointer")?.className).not.toContain("bg-primary-fixed-dim/20");
	});

	it("toggles entries with Ctrl+click", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(selectionEntries);

		render(
			<FilePane type="local" connectionId={1} initialPath="/home/admin" />
		);
		await waitForEntries();
		const user = userEvent.setup();

		await user.click(screen.getByText("projects"));
		await user.keyboard("{Control>}");
		await user.click(screen.getByText("backups"));
		await user.keyboard("{/Control}");

		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");
		expect(screen.getByText("backups").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");

		await user.keyboard("{Control>}");
		await user.click(screen.getByText("projects"));
		await user.keyboard("{/Control}");

		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).not.toContain("bg-primary-fixed-dim/20");
		expect(screen.getByText("backups").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");
	});

	it("selects a range with Shift+click", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(selectionEntries);

		render(
			<FilePane type="local" connectionId={1} initialPath="/home/admin" />
		);
		await waitForEntries();
		const user = userEvent.setup();

		await user.click(screen.getByText("projects"));
		await user.keyboard("{Shift>}");
		await user.click(screen.getByText("notes.txt"));
		await user.keyboard("{/Shift}");

		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");
		expect(screen.getByText("config.json").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");
		expect(screen.getByText("notes.txt").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");
		expect(screen.getByText("backups").closest(".cursor-pointer")?.className).not.toContain("bg-primary-fixed-dim/20");
	});

	it("uses first entry as anchor when Shift+click with no prior selection", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(selectionEntries);

		render(
			<FilePane type="local" connectionId={1} initialPath="/home/admin" />
		);
		await waitForEntries();
		const user = userEvent.setup();

		await user.keyboard("{Shift>}");
		await user.click(screen.getByText("config.json"));
		await user.keyboard("{/Shift}");

		expect(screen.getByText("backups").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");
		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");
		expect(screen.getByText("config.json").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");
		expect(screen.getByText("notes.txt").closest(".cursor-pointer")?.className).not.toContain("bg-primary-fixed-dim/20");
	});

	it("clears selection on navigate back", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(selectionEntriesWithWebapp);

		render(
			<FilePane type="local" connectionId={1} initialPath="/home/admin" />
		);
		await waitForEntries();

		await userEvent.click(screen.getByText("projects"));
		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");

		await userEvent.dblClick(screen.getByText("projects"));
		const pane = document.querySelector(".flex-1.flex.flex-col.overflow-hidden");
		if (!pane) throw new Error("Pane element not found");
		pane.dispatchEvent(new MouseEvent("mousedown", { button: 3, bubbles: true, cancelable: true }));

		await waitFor(() => {
			expect(screen.getByText("projects").closest(".cursor-pointer")?.className).not.toContain("bg-primary-fixed-dim/20");
		});
	});

	it("clears selection on navigate forward", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValueOnce(selectionEntriesWithWebapp)
			.mockResolvedValueOnce([
				{ name: "webapp", isDirectory: false, size: 300, modified: "" },
			])
			.mockResolvedValue(selectionEntriesWithWebapp);

		render(
			<FilePane type="local" connectionId={1} initialPath="/home/admin" />
		);
		await waitForEntries();
		const user = userEvent.setup();

		await user.dblClick(screen.getByText("projects"));
		await user.click(screen.getByText("webapp"));
		expect(screen.getByText("webapp").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");

		const pane = document.querySelector(".flex-1.flex.flex-col.overflow-hidden");
		if (!pane) throw new Error("Pane element not found");
		pane.dispatchEvent(new MouseEvent("mousedown", { button: 3, bubbles: true, cancelable: true }));
		pane.dispatchEvent(new MouseEvent("mousedown", { button: 4, bubbles: true, cancelable: true }));

		await waitFor(() => {
			expect(screen.getByText("webapp").closest(".cursor-pointer")?.className).not.toContain("bg-primary-fixed-dim/20");
		});
	});

	it("uses forward slashes for remote paths on Windows platform", async () => {
		const mockApiWin = createMockApi({
			platform: "win32",
			filesystem: {
				list: vi.fn().mockResolvedValue([]),
				listDrives: vi.fn().mockResolvedValue(["C:\\"]),
				homeDir: vi.fn().mockResolvedValue("C:\\Users\\user"),
				pathExists: vi.fn().mockResolvedValue(true),
				getLastPath: vi.fn().mockResolvedValue(null),
				setLastPath: vi.fn().mockResolvedValue(undefined),
				getIcon: vi.fn<() => Promise<string | null>>().mockResolvedValue(null),
				remoteConnect: vi.fn().mockResolvedValue("/"),
				remoteDisconnect: vi.fn().mockResolvedValue(undefined),
				remoteList: vi.fn().mockResolvedValue([
					{ name: "var", isDirectory: true, size: 0, modified: "" },
					{ name: "etc", isDirectory: true, size: 0, modified: "" },
				]),
				remoteHomeDir: vi.fn().mockResolvedValue("/"),
			},
		});
		vi.stubGlobal("api", mockApiWin);
		usePlatformStore.setState({
			platform: "win32",
			isWindows: true,
			isLinux: false,
			isMacOS: false,
			pathSep: "\\",
		});

		render(
			<FilePane type="remote" connectionId={1} initialPath="/home" />
		);

		await screen.findByText("var");
		expect(mockApiWin.filesystem.remoteList).toHaveBeenCalledWith(1, "/home");

		await userEvent.dblClick(screen.getByText("var"));
		expect(mockApiWin.filesystem.remoteList).toHaveBeenCalledWith(1, "/home/var");

		usePlatformStore.setState({
			platform: "linux",
			isWindows: false,
			isLinux: true,
			isMacOS: false,
			pathSep: "/",
		});
		vi.stubGlobal("api", mockApi);
	});

	it("uses forward slashes for nested remote paths on Windows platform", async () => {
		const remoteListWin = vi.fn()
			.mockResolvedValueOnce([
				{ name: "subdir", isDirectory: true, size: 0, modified: "" },
			])
			.mockResolvedValueOnce([
				{ name: "deep", isDirectory: true, size: 0, modified: "" },
			]);
		const mockApiWin2 = createMockApi({
			platform: "win32",
			filesystem: {
				list: vi.fn().mockResolvedValue([]),
				listDrives: vi.fn().mockResolvedValue(["C:\\"]),
				homeDir: vi.fn().mockResolvedValue("C:\\Users\\user"),
				pathExists: vi.fn().mockResolvedValue(true),
				getLastPath: vi.fn().mockResolvedValue(null),
				setLastPath: vi.fn().mockResolvedValue(undefined),
				getIcon: vi.fn<() => Promise<string | null>>().mockResolvedValue(null),
				remoteConnect: vi.fn().mockResolvedValue("/"),
				remoteDisconnect: vi.fn().mockResolvedValue(undefined),
				remoteList: remoteListWin,
				remoteHomeDir: vi.fn().mockResolvedValue("/"),
			},
		});
		vi.stubGlobal("api", mockApiWin2);
		usePlatformStore.setState({
			platform: "win32",
			isWindows: true,
			isLinux: false,
			isMacOS: false,
			pathSep: "\\",
		});

		render(
			<FilePane type="remote" connectionId={1} initialPath="/home/user" />
		);

		await screen.findByText("subdir");
		await userEvent.dblClick(screen.getByText("subdir"));
		expect(mockApiWin2.filesystem.remoteList).toHaveBeenCalledWith(1, "/home/user/subdir");

		usePlatformStore.setState({
			platform: "linux",
			isWindows: false,
			isLinux: true,
			isMacOS: false,
			pathSep: "/",
		});
		vi.stubGlobal("api", mockApi);
	});

	it("navigates back with forward slashes for remote paths on Windows", async () => {
		const remoteListWin = vi.fn()
			.mockResolvedValueOnce([
				{ name: "docs", isDirectory: true, size: 0, modified: "" },
			])
			.mockResolvedValueOnce([
				{ name: "file.txt", isDirectory: false, size: 100, modified: "" },
			])
			.mockResolvedValueOnce([
				{ name: "docs", isDirectory: true, size: 0, modified: "" },
			]);
		const mockApiWin3 = createMockApi({
			platform: "win32",
			filesystem: {
				list: vi.fn().mockResolvedValue([]),
				listDrives: vi.fn().mockResolvedValue(["C:\\"]),
				homeDir: vi.fn().mockResolvedValue("C:\\Users\\user"),
				pathExists: vi.fn().mockResolvedValue(true),
				getLastPath: vi.fn().mockResolvedValue(null),
				setLastPath: vi.fn().mockResolvedValue(undefined),
				getIcon: vi.fn<() => Promise<string | null>>().mockResolvedValue(null),
				remoteConnect: vi.fn().mockResolvedValue("/"),
				remoteDisconnect: vi.fn().mockResolvedValue(undefined),
				remoteList: remoteListWin,
				remoteHomeDir: vi.fn().mockResolvedValue("/"),
			},
		});
		vi.stubGlobal("api", mockApiWin3);
		usePlatformStore.setState({
			platform: "win32",
			isWindows: true,
			isLinux: false,
			isMacOS: false,
			pathSep: "\\",
		});

		render(
			<FilePane type="remote" connectionId={1} initialPath="/home" />
		);

		await screen.findByText("docs");
		await userEvent.dblClick(screen.getByText("docs"));

		const pane = document.querySelector(".flex-1.flex.flex-col.overflow-hidden");
		if (!pane) throw new Error("Pane element not found");
		pane.dispatchEvent(new MouseEvent("mousedown", { button: 3, bubbles: true, cancelable: true }));
		expect(mockApiWin3.filesystem.remoteList).toHaveBeenCalledWith(1, "/home");

		usePlatformStore.setState({
			platform: "linux",
			isWindows: false,
			isLinux: true,
			isMacOS: false,
			pathSep: "/",
		});
		vi.stubGlobal("api", mockApi);
	});

	it("clears selection on navigate up", async () => {
		window.api.filesystem.list = vi.fn()
			.mockResolvedValueOnce(selectionEntries)
			.mockResolvedValueOnce([
				{ name: "admin", isDirectory: true, size: 0, modified: "" },
				{ name: "deploy", isDirectory: false, size: 100, modified: "" },
			]);

		render(
			<FilePane type="local" connectionId={1} initialPath="/home/admin" />
		);
		await waitForEntries();

		await userEvent.click(screen.getByText("projects"));
		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");

		await userEvent.click(screen.getByTitle("Parent Directory"));

		expect(screen.getByText("admin").closest(".cursor-pointer")?.className).not.toContain("bg-primary-fixed-dim/20");
		expect(screen.getByText("deploy").closest(".cursor-pointer")?.className).not.toContain("bg-primary-fixed-dim/20");
	});

	// --- search/filter ---

	const filterEntries = [
		{ name: "albacete", isDirectory: true, size: 0, modified: "" },
		{ name: "jaen", isDirectory: true, size: 0, modified: "" },
		{ name: "granada", isDirectory: false, size: 100, modified: "" },
		{ name: "readme.md", isDirectory: false, size: 200, modified: "" },
		{ name: "config.json", isDirectory: false, size: 300, modified: "" },
	];

	it("filter input shows all entries when empty", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(filterEntries);

		render(<FilePane type="local" connectionId={1} initialPath="/cities" />);
		await waitForEntries();

		expect(screen.getByText("albacete")).toBeInTheDocument();
		expect(screen.getByText("jaen")).toBeInTheDocument();
		expect(screen.getByText("granada")).toBeInTheDocument();
		expect(screen.getByText("readme.md")).toBeInTheDocument();
		expect(screen.getByText("config.json")).toBeInTheDocument();
	});

	it("plain text filter shows only entries containing the text", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(filterEntries);

		render(<FilePane type="local" connectionId={1} initialPath="/cities" />);
		await waitForEntries();

		const filterInput = screen.getByPlaceholderText("Filter...");
		await userEvent.type(filterInput, "a");

		expect(screen.getByText("albacete")).toBeInTheDocument();
		expect(screen.getByText("jaen")).toBeInTheDocument();
		expect(screen.getByText("granada")).toBeInTheDocument();
		expect(screen.getByText("readme.md")).toBeInTheDocument();
		expect(screen.queryByText("config.json")).not.toBeInTheDocument();
	});

	it("plain text filter matches substring in middle of name", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(filterEntries);

		render(<FilePane type="local" connectionId={1} initialPath="/cities" />);
		await waitForEntries();

		const filterInput = screen.getByPlaceholderText("Filter...");
		await userEvent.type(filterInput, "ana");

		expect(screen.getByText("granada")).toBeInTheDocument();
		expect(screen.queryByText("albacete")).not.toBeInTheDocument();
		expect(screen.queryByText("jaen")).not.toBeInTheDocument();
		expect(screen.queryByText("readme.md")).not.toBeInTheDocument();
		expect(screen.queryByText("config.json")).not.toBeInTheDocument();
	});

	it("trailing wildcard filters files starting with pattern", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(filterEntries);

		render(<FilePane type="local" connectionId={1} initialPath="/cities" />);
		await waitForEntries();

		const filterInput = screen.getByPlaceholderText("Filter...");
		await userEvent.type(filterInput, "alb*");

		expect(screen.getByText("albacete")).toBeInTheDocument();
		expect(screen.queryByText("jaen")).not.toBeInTheDocument();
		expect(screen.queryByText("granada")).not.toBeInTheDocument();
		expect(screen.queryByText("readme.md")).not.toBeInTheDocument();
	});

	it("leading wildcard filters files ending with pattern", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(filterEntries);

		render(<FilePane type="local" connectionId={1} initialPath="/cities" />);
		await waitForEntries();

		const filterInput = screen.getByPlaceholderText("Filter...");
		await userEvent.type(filterInput, "*en");

		expect(screen.getByText("jaen")).toBeInTheDocument();
		expect(screen.queryByText("albacete")).not.toBeInTheDocument();
		expect(screen.queryByText("granada")).not.toBeInTheDocument();
		expect(screen.queryByText("readme.md")).not.toBeInTheDocument();
	});

	it("wildcards on both sides filters files containing pattern", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(filterEntries);

		render(<FilePane type="local" connectionId={1} initialPath="/cities" />);
		await waitForEntries();

		const filterInput = screen.getByPlaceholderText("Filter...");
		await userEvent.type(filterInput, "*a*");

		expect(screen.getByText("albacete")).toBeInTheDocument();
		expect(screen.getByText("jaen")).toBeInTheDocument();
		expect(screen.getByText("granada")).toBeInTheDocument();
		expect(screen.getByText("readme.md")).toBeInTheDocument();
		expect(screen.queryByText("config.json")).not.toBeInTheDocument();
	});

	it("wildcard in middle filters files with prefix and suffix", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(filterEntries);

		render(<FilePane type="local" connectionId={1} initialPath="/cities" />);
		await waitForEntries();

		const filterInput = screen.getByPlaceholderText("Filter...");
		await userEvent.type(filterInput, "g*a");

		expect(screen.getByText("granada")).toBeInTheDocument();
		expect(screen.queryByText("albacete")).not.toBeInTheDocument();
		expect(screen.queryByText("jaen")).not.toBeInTheDocument();
		expect(screen.queryByText("readme.md")).not.toBeInTheDocument();
	});

	it("filter is case-insensitive", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(filterEntries);

		render(<FilePane type="local" connectionId={1} initialPath="/cities" />);
		await waitForEntries();

		const filterInput = screen.getByPlaceholderText("Filter...");
		await userEvent.type(filterInput, "GRANADA");

		expect(screen.getByText("granada")).toBeInTheDocument();
		expect(screen.queryByText("albacete")).not.toBeInTheDocument();
		expect(screen.queryByText("jaen")).not.toBeInTheDocument();
	});

	it("filter shows empty state when no entries match", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(filterEntries);

		render(<FilePane type="local" connectionId={1} initialPath="/cities" />);
		await waitForEntries();

		const filterInput = screen.getByPlaceholderText("Filter...");
		await userEvent.type(filterInput, "zzz");

		expect(screen.getByText("This folder is empty")).toBeInTheDocument();
	});

	it("clear filter button resets filter and shows all entries", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(filterEntries);

		render(<FilePane type="local" connectionId={1} initialPath="/cities" />);
		await waitForEntries();

		const filterInput = screen.getByPlaceholderText("Filter...");
		await userEvent.type(filterInput, "zzz");
		expect(screen.getByText("This folder is empty")).toBeInTheDocument();

		await userEvent.click(screen.getByTitle("Clear filter"));
		expect(screen.getByText("albacete")).toBeInTheDocument();
		expect(screen.getByText("jaen")).toBeInTheDocument();
		expect(screen.getByText("granada")).toBeInTheDocument();
		expect(screen.getByText("readme.md")).toBeInTheDocument();
		expect(screen.getByText("config.json")).toBeInTheDocument();
	});

	it("filter entries are passed to FileList for selection", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(filterEntries);

		render(<FilePane type="local" connectionId={1} initialPath="/cities" />);
		await waitForEntries();

		const filterInput = screen.getByPlaceholderText("Filter...");
		await userEvent.type(filterInput, "a");

		await userEvent.click(screen.getByText("granada"));
		expect(screen.getByText("granada").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");
	});

	it("filter with dot pattern filters by extension", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(filterEntries);

		render(<FilePane type="local" connectionId={1} initialPath="/cities" />);
		await waitForEntries();

		const filterInput = screen.getByPlaceholderText("Filter...");
		await userEvent.type(filterInput, "*.json");

		expect(screen.getByText("config.json")).toBeInTheDocument();
		expect(screen.queryByText("albacete")).not.toBeInTheDocument();
		expect(screen.queryByText("jaen")).not.toBeInTheDocument();
		expect(screen.queryByText("granada")).not.toBeInTheDocument();
		expect(screen.queryByText("readme.md")).not.toBeInTheDocument();
	});
});
