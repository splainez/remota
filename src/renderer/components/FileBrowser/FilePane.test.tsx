import { useNavigationStore } from "@renderer/store/navigation";
import { usePlatformStore } from "@renderer/store/platform";
import { useSettingsStore } from "@renderer/store/settings";
import { I18nWrapper } from "@renderer/test/i18n-wrapper";
import { createMockApi } from "@renderer/test/setup";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

import { FilePane } from "./FilePane";

const hotkeyCallbacks = new Map<string, () => void>();

vi.mock("react-hotkeys-hook", () => ({
	useHotkeys: (keys: string, callback: () => void) => {
		hotkeyCallbacks.set(keys, callback);
	},
}));

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
		openPath: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		rename: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		remoteConnect: vi.fn().mockResolvedValue("/"),
		remoteDisconnect: vi.fn().mockResolvedValue(undefined),
		remoteIsConnected: vi.fn().mockResolvedValue(false),
		remoteList: vi.fn().mockResolvedValue([]),
		remoteHomeDir: vi.fn().mockResolvedValue("/"),
		remoteRename: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		delete: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		remoteDelete: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		tempGetPath: vi.fn().mockResolvedValue(undefined),
		tempWrite: vi.fn().mockResolvedValue(undefined),
		tempRead: vi.fn().mockResolvedValue([]),
		tempMkdir: vi.fn().mockResolvedValue(undefined),
		tempDelete: vi.fn().mockResolvedValue(undefined),
		tempExists: vi.fn().mockResolvedValue(false),
		download: vi.fn().mockResolvedValue({ jobId: "test-job" }),
		upload: vi.fn().mockResolvedValue({ jobId: "test-job" }),
		getLocalStat: vi.fn().mockResolvedValue({ exists: false, size: 0, modified: "", isDirectory: false }),
		getRemoteStat: vi.fn().mockResolvedValue(null),
		onTransferProgress: vi.fn().mockReturnValue(vi.fn()),
		onTransferJobDone: vi.fn().mockReturnValue(vi.fn()),
		cancelTransfer: vi.fn().mockResolvedValue(undefined),
		cancelAllTransfers: vi.fn().mockResolvedValue(undefined),
		cancelTransfersForConnection: vi.fn().mockResolvedValue(undefined),
		startWatch: vi.fn().mockResolvedValue(undefined),
		stopWatch: vi.fn().mockResolvedValue(undefined),
		onFileChanged: vi.fn().mockReturnValue(vi.fn()),
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
		useSettingsStore.setState({
			theme: "system",
			locale: "en",
			externalTerminal: undefined,
			loaded: true,
		});
	});

	it("renders toolbar with up, refresh and new folder buttons (local)", () => {
		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home/user" />
			</I18nWrapper>,
		);
		expect(screen.getByTitle("Parent Directory")).toBeInTheDocument();
		expect(screen.getByTitle("Refresh")).toBeInTheDocument();
		expect(screen.getByTitle("New Folder")).toBeInTheDocument();
	});

	it("renders toolbar with up, refresh and new folder buttons (remote)", () => {
		render(
			<I18nWrapper>
				<FilePane type="remote" connectionId={1} initialPath="/" />
			</I18nWrapper>,
		);
		expect(screen.getByTitle("Parent Directory")).toBeInTheDocument();
		expect(screen.getByTitle("Refresh")).toBeInTheDocument();
		expect(screen.getByTitle("New Folder")).toBeInTheDocument();
	});

	it("initializes navigation history with initialPath", () => {
		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home/user" />
			</I18nWrapper>,
		);
		const store = useNavigationStore.getState();
		expect(store.panes.local.entries).toEqual(["/home/user"]);
		expect(store.panes.local.index).toBe(0);
	});

	it("clears and re-initializes history on connection change", () => {
		const { rerender } = render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home/user" />
			</I18nWrapper>,
		);
		flushStore();
		rerender(
			<I18nWrapper>
				<FilePane type="local" connectionId={2} initialPath="/var/log" />
			</I18nWrapper>,
		);
		const store = useNavigationStore.getState();
		expect(store.panes.local.entries).toEqual(["/var/log"]);
		expect(store.panes.local.index).toBe(0);
	});

	it("navigates back after entering a directory", async () => {
		const dirEntries = [{ name: "admin", isDirectory: true, size: 0, modified: "" }];
		window.api.filesystem.list = vi.fn().mockResolvedValue(dirEntries);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
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
		const dirEntries = [{ name: "admin", isDirectory: true, size: 0, modified: "" }];
		window.api.filesystem.list = vi.fn().mockResolvedValue(dirEntries);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
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
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home/user" />
			</I18nWrapper>,
		);
		expect(screen.queryByTitle("Back")).not.toBeInTheDocument();
		expect(screen.queryByTitle("Forward")).not.toBeInTheDocument();
	});

	it("calls goBack on mouse button 3 (back)", () => {
		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);

		useNavigationStore.getState().push("local", "/home/user");
		useNavigationStore.getState().push("local", "/home/user/docs");

		const pane = document.querySelector(".flex.flex-col.overflow-hidden");
		if (!pane) throw new Error("Pane element not found");
		const event = new MouseEvent("mousedown", { button: 3, bubbles: true, cancelable: true });
		pane.dispatchEvent(event);

		expect(useNavigationStore.getState().panes.local.index).toBe(1);
	});

	it("calls goForward on mouse button 4 (forward)", () => {
		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);

		useNavigationStore.getState().push("local", "/home/user");
		useNavigationStore.getState().push("local", "/home/user/docs");
		useNavigationStore.getState().goBack("local");

		const pane = document.querySelector(".flex.flex-col.overflow-hidden");
		if (!pane) throw new Error("Pane element not found");
		const event = new MouseEvent("mousedown", { button: 4, bubbles: true, cancelable: true });
		pane.dispatchEvent(event);

		expect(useNavigationStore.getState().panes.local.index).toBe(2);
	});

	it("does not navigate on regular mouse click (button 0)", () => {
		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);

		useNavigationStore.getState().push("local", "/home/user");

		const pane = document.querySelector(".flex.flex-col.overflow-hidden");
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
			<I18nWrapper>
				<FilePane type="remote" connectionId={5} initialPath="/" />
			</I18nWrapper>,
		);

		await screen.findByText("var");
		expect(window.api.filesystem.remoteList).toHaveBeenCalledWith(5, "/");
	});

	it("uses local IPC for local pane even when remoteList is available", async () => {
		const localEntries = [{ name: "docs", isDirectory: true, size: 0, modified: "" }];
		window.api.filesystem.list = vi.fn().mockResolvedValue(localEntries);
		window.api.filesystem.remoteList = vi.fn().mockResolvedValue([]);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);

		await screen.findByText("docs");
		expect(window.api.filesystem.list).toHaveBeenCalledWith("/home");
	});

	it("shows reconnect prompt when not connected error occurs", async () => {
		window.api.filesystem.remoteList = vi.fn().mockRejectedValue(new Error("Not connected to remote server"));
		const onReconnect = vi.fn();

		render(
			<I18nWrapper>
				<FilePane type="remote" connectionId={1} initialPath="/" onReconnect={onReconnect} />
			</I18nWrapper>,
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
			<I18nWrapper>
				<FilePane
					type="remote"
					connectionId={1}
					initialPath="/"
					connectionError={connectionError}
					onReconnect={vi.fn()}
				/>
			</I18nWrapper>,
		);

		expect(screen.getByText("Reconnect")).toBeInTheDocument();
	});

	it("shows inline error with detail toggle when listing fails with permission denied", async () => {
		window.api.filesystem.remoteList = vi.fn().mockRejectedValue(new Error("Permission denied"));

		render(
			<I18nWrapper>
				<FilePane type="remote" connectionId={1} initialPath="/root" />
			</I18nWrapper>,
		);

		await screen.findByText("Show details");
		expect(screen.getByText("Permission denied")).toBeInTheDocument();

		await userEvent.click(screen.getByText("Show details"));

		expect(screen.getByText("Hide details")).toBeInTheDocument();
		expect(screen.getAllByText("Permission denied")).toHaveLength(2);
	});

	it("keeps toolbar functional when listing error occurs", async () => {
		window.api.filesystem.remoteList = vi.fn().mockRejectedValue(new Error("Permission denied"));

		render(
			<I18nWrapper>
				<FilePane type="remote" connectionId={1} initialPath="/root" />
			</I18nWrapper>,
		);

		await screen.findByText("Permission denied");

		expect(screen.getByTitle("Parent Directory")).toBeInTheDocument();
		expect(screen.getByTitle("Refresh")).toBeInTheDocument();
	});

	it("toggles error detail visibility", async () => {
		window.api.filesystem.remoteList = vi.fn().mockRejectedValue(new Error("Permission denied"));

		render(
			<I18nWrapper>
				<FilePane type="remote" connectionId={1} initialPath="/root" />
			</I18nWrapper>,
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
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home/admin" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await userEvent.click(screen.getByText("projects"));
		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");
		expect(screen.getByText("backups").closest(".cursor-pointer")?.className).not.toContain("bg-primary-fixed-dim/20");
	});

	it("clears previous selection on plain click", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(selectionEntries);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home/admin" />
			</I18nWrapper>,
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
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home/admin" />
			</I18nWrapper>,
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
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home/admin" />
			</I18nWrapper>,
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
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home/admin" />
			</I18nWrapper>,
		);
		await waitForEntries();
		const user = userEvent.setup();

		await user.keyboard("{Shift>}");
		await user.click(screen.getByText("config.json"));
		await user.keyboard("{/Shift}");

		expect(screen.getByText("backups").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");
		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");
		expect(screen.getByText("config.json").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");
		expect(screen.getByText("notes.txt").closest(".cursor-pointer")?.className).not.toContain(
			"bg-primary-fixed-dim/20",
		);
	});

	it("clears selection on navigate back", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(selectionEntriesWithWebapp);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home/admin" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await userEvent.click(screen.getByText("projects"));
		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");

		await userEvent.dblClick(screen.getByText("projects"));
		const pane = document.querySelector(".flex-1.flex.flex-col.overflow-hidden");
		if (!pane) throw new Error("Pane element not found");
		pane.dispatchEvent(new MouseEvent("mousedown", { button: 3, bubbles: true, cancelable: true }));

		await waitFor(() => {
			expect(screen.getByText("projects").closest(".cursor-pointer")?.className).not.toContain(
				"bg-primary-fixed-dim/20",
			);
		});
	});

	it("clears selection on navigate forward", async () => {
		window.api.filesystem.list = vi
			.fn()
			.mockResolvedValueOnce(selectionEntriesWithWebapp)
			.mockResolvedValueOnce([{ name: "webapp", isDirectory: false, size: 300, modified: "" }])
			.mockResolvedValue(selectionEntriesWithWebapp);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home/admin" />
			</I18nWrapper>,
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
				openPath: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
				rename: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
				remoteConnect: vi.fn().mockResolvedValue("/"),
				remoteDisconnect: vi.fn().mockResolvedValue(undefined),
				remoteIsConnected: vi.fn().mockResolvedValue(false),
				remoteList: vi.fn().mockResolvedValue([
					{ name: "var", isDirectory: true, size: 0, modified: "" },
					{ name: "etc", isDirectory: true, size: 0, modified: "" },
				]),
				remoteHomeDir: vi.fn().mockResolvedValue("/"),
				remoteRename: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
				delete: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
				remoteDelete: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
				tempGetPath: vi.fn().mockResolvedValue(undefined),
				tempWrite: vi.fn().mockResolvedValue(undefined),
				tempRead: vi.fn().mockResolvedValue([]),
				tempMkdir: vi.fn().mockResolvedValue(undefined),
				tempDelete: vi.fn().mockResolvedValue(undefined),
				tempExists: vi.fn().mockResolvedValue(false),
				download: vi.fn().mockResolvedValue({ jobId: "test-job" }),
				upload: vi.fn().mockResolvedValue({ jobId: "test-job" }),
				getLocalStat: vi.fn().mockResolvedValue({ exists: false, size: 0, modified: "", isDirectory: false }),
				getRemoteStat: vi.fn().mockResolvedValue(null),
				onTransferProgress: vi.fn().mockReturnValue(vi.fn()),
				onTransferJobDone: vi.fn().mockReturnValue(vi.fn()),
				cancelTransfer: vi.fn().mockResolvedValue(undefined),
				cancelAllTransfers: vi.fn().mockResolvedValue(undefined),
				cancelTransfersForConnection: vi.fn().mockResolvedValue(undefined),
				startWatch: vi.fn().mockResolvedValue(undefined),
				stopWatch: vi.fn().mockResolvedValue(undefined),
				onFileChanged: vi.fn().mockReturnValue(vi.fn()),
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
			<I18nWrapper>
				<FilePane type="remote" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
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
		const remoteListWin = vi
			.fn()
			.mockResolvedValueOnce([{ name: "subdir", isDirectory: true, size: 0, modified: "" }])
			.mockResolvedValueOnce([{ name: "deep", isDirectory: true, size: 0, modified: "" }]);
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
				openPath: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
				rename: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
				remoteConnect: vi.fn().mockResolvedValue("/"),
				remoteDisconnect: vi.fn().mockResolvedValue(undefined),
				remoteIsConnected: vi.fn().mockResolvedValue(false),
				remoteList: remoteListWin,
				remoteHomeDir: vi.fn().mockResolvedValue("/"),
				remoteRename: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
				delete: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
				remoteDelete: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
				tempGetPath: vi.fn().mockResolvedValue(undefined),
				tempWrite: vi.fn().mockResolvedValue(undefined),
				tempRead: vi.fn().mockResolvedValue([]),
				tempMkdir: vi.fn().mockResolvedValue(undefined),
				tempDelete: vi.fn().mockResolvedValue(undefined),
				tempExists: vi.fn().mockResolvedValue(false),
				download: vi.fn().mockResolvedValue({ jobId: "test-job" }),
				upload: vi.fn().mockResolvedValue({ jobId: "test-job" }),
				getLocalStat: vi.fn().mockResolvedValue({ exists: false, size: 0, modified: "", isDirectory: false }),
				getRemoteStat: vi.fn().mockResolvedValue(null),
				onTransferProgress: vi.fn().mockReturnValue(vi.fn()),
				onTransferJobDone: vi.fn().mockReturnValue(vi.fn()),
				cancelTransfer: vi.fn().mockResolvedValue(undefined),
				cancelAllTransfers: vi.fn().mockResolvedValue(undefined),
				cancelTransfersForConnection: vi.fn().mockResolvedValue(undefined),
				startWatch: vi.fn().mockResolvedValue(undefined),
				stopWatch: vi.fn().mockResolvedValue(undefined),
				onFileChanged: vi.fn().mockReturnValue(vi.fn()),
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
			<I18nWrapper>
				<FilePane type="remote" connectionId={1} initialPath="/home/user" />
			</I18nWrapper>,
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
		const remoteListWin = vi
			.fn()
			.mockResolvedValueOnce([{ name: "docs", isDirectory: true, size: 0, modified: "" }])
			.mockResolvedValueOnce([{ name: "file.txt", isDirectory: false, size: 100, modified: "" }])
			.mockResolvedValueOnce([{ name: "docs", isDirectory: true, size: 0, modified: "" }]);
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
				openPath: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
				rename: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
				remoteConnect: vi.fn().mockResolvedValue("/"),
				remoteDisconnect: vi.fn().mockResolvedValue(undefined),
				remoteIsConnected: vi.fn().mockResolvedValue(false),
				remoteList: remoteListWin,
				remoteHomeDir: vi.fn().mockResolvedValue("/"),
				remoteRename: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
				delete: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
				remoteDelete: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
				tempGetPath: vi.fn().mockResolvedValue(undefined),
				tempWrite: vi.fn().mockResolvedValue(undefined),
				tempRead: vi.fn().mockResolvedValue([]),
				tempMkdir: vi.fn().mockResolvedValue(undefined),
				tempDelete: vi.fn().mockResolvedValue(undefined),
				tempExists: vi.fn().mockResolvedValue(false),
				download: vi.fn().mockResolvedValue({ jobId: "test-job" }),
				upload: vi.fn().mockResolvedValue({ jobId: "test-job" }),
				getLocalStat: vi.fn().mockResolvedValue({ exists: false, size: 0, modified: "", isDirectory: false }),
				getRemoteStat: vi.fn().mockResolvedValue(null),
				onTransferProgress: vi.fn().mockReturnValue(vi.fn()),
				onTransferJobDone: vi.fn().mockReturnValue(vi.fn()),
				cancelTransfer: vi.fn().mockResolvedValue(undefined),
				cancelAllTransfers: vi.fn().mockResolvedValue(undefined),
				cancelTransfersForConnection: vi.fn().mockResolvedValue(undefined),
				startWatch: vi.fn().mockResolvedValue(undefined),
				stopWatch: vi.fn().mockResolvedValue(undefined),
				onFileChanged: vi.fn().mockReturnValue(vi.fn()),
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
			<I18nWrapper>
				<FilePane type="remote" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
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
		window.api.filesystem.list = vi
			.fn()
			.mockResolvedValueOnce(selectionEntries)
			.mockResolvedValueOnce([
				{ name: "admin", isDirectory: true, size: 0, modified: "" },
				{ name: "deploy", isDirectory: false, size: 100, modified: "" },
			]);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home/admin" />
			</I18nWrapper>,
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

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/cities" />
			</I18nWrapper>,
		);
		await waitForEntries();

		expect(screen.getByText("albacete")).toBeInTheDocument();
		expect(screen.getByText("jaen")).toBeInTheDocument();
		expect(screen.getByText("granada")).toBeInTheDocument();
		expect(screen.getByText("readme.md")).toBeInTheDocument();
		expect(screen.getByText("config.json")).toBeInTheDocument();
	});

	it("plain text filter shows only entries containing the text", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(filterEntries);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/cities" />
			</I18nWrapper>,
		);
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

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/cities" />
			</I18nWrapper>,
		);
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

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/cities" />
			</I18nWrapper>,
		);
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

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/cities" />
			</I18nWrapper>,
		);
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

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/cities" />
			</I18nWrapper>,
		);
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

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/cities" />
			</I18nWrapper>,
		);
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

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/cities" />
			</I18nWrapper>,
		);
		await waitForEntries();

		const filterInput = screen.getByPlaceholderText("Filter...");
		await userEvent.type(filterInput, "GRANADA");

		expect(screen.getByText("granada")).toBeInTheDocument();
		expect(screen.queryByText("albacete")).not.toBeInTheDocument();
		expect(screen.queryByText("jaen")).not.toBeInTheDocument();
	});

	it("filter shows empty state when no entries match", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(filterEntries);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/cities" />
			</I18nWrapper>,
		);
		await waitForEntries();

		const filterInput = screen.getByPlaceholderText("Filter...");
		await userEvent.type(filterInput, "zzz");

		expect(screen.getByText("This folder is empty")).toBeInTheDocument();
	});

	it("clear filter button resets filter and shows all entries", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(filterEntries);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/cities" />
			</I18nWrapper>,
		);
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

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/cities" />
			</I18nWrapper>,
		);
		await waitForEntries();

		const filterInput = screen.getByPlaceholderText("Filter...");
		await userEvent.type(filterInput, "a");

		await userEvent.click(screen.getByText("granada"));
		expect(screen.getByText("granada").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");
	});

	it("filter with dot pattern filters by extension", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue(filterEntries);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/cities" />
			</I18nWrapper>,
		);
		await waitForEntries();

		const filterInput = screen.getByPlaceholderText("Filter...");
		await userEvent.type(filterInput, "*.json");

		expect(screen.getByText("config.json")).toBeInTheDocument();
		expect(screen.queryByText("albacete")).not.toBeInTheDocument();
		expect(screen.queryByText("jaen")).not.toBeInTheDocument();
		expect(screen.queryByText("granada")).not.toBeInTheDocument();
		expect(screen.queryByText("readme.md")).not.toBeInTheDocument();
	});

	// --- "Open in terminal" context-menu action ---

	async function rightClickDirectory(directoryName: string) {
		const dir = await screen.findByText(directoryName);
		fireEvent.contextMenu(dir);
	}

	it("toggles the integrated terminal when 'Open in terminal' is clicked and no external is configured", async () => {
		useSettingsStore.setState({ externalTerminal: undefined });
		window.api.filesystem.list = vi
			.fn()
			.mockResolvedValue([{ name: "docs", isDirectory: true, fullPath: "/home/docs", size: 0, modified: "" }]);
		window.api.terminal.openExternal = vi.fn().mockResolvedValue(undefined);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await rightClickDirectory("docs");
		await userEvent.click(screen.getByText("Open in terminal"));

		expect(window.api.terminal.openExternal).not.toHaveBeenCalled();
	});

	it("calls openExternal with current local path when external terminal is configured", async () => {
		useSettingsStore.setState({ externalTerminal: "kitty" });
		window.api.filesystem.list = vi
			.fn()
			.mockResolvedValue([{ name: "docs", isDirectory: true, fullPath: "/home/docs", size: 0, modified: "" }]);
		window.api.terminal.openExternal = vi.fn().mockResolvedValue(undefined);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await rightClickDirectory("docs");
		await userEvent.click(screen.getByText("Open in terminal"));

		expect(window.api.terminal.openExternal).toHaveBeenCalledWith(1, "/home", "local");
	});

	it("calls openExternal with the right-clicked entry's full path on remote", async () => {
		useSettingsStore.setState({ externalTerminal: "kitty" });
		window.api.filesystem.remoteList = vi
			.fn()
			.mockResolvedValue([{ name: "var", isDirectory: true, fullPath: "/var", size: 0, modified: "" }]);
		window.api.terminal.openExternal = vi.fn().mockResolvedValue(undefined);

		render(
			<I18nWrapper>
				<FilePane type="remote" connectionId={5} initialPath="/" protocol="sftp" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await rightClickDirectory("var");
		await userEvent.click(screen.getByText("Open in terminal"));

		expect(window.api.terminal.openExternal).toHaveBeenCalledWith(5, "/var", "remote");
	});

	it("falls back to integrated terminal and shows error toast when openExternal throws", async () => {
		useSettingsStore.setState({ externalTerminal: "kitty" });
		window.api.filesystem.list = vi
			.fn()
			.mockResolvedValue([{ name: "docs", isDirectory: true, fullPath: "/home/docs", size: 0, modified: "" }]);
		window.api.terminal.openExternal = vi.fn().mockRejectedValue(new Error("spawn failed"));
		const { toast } = await import("sonner");
		const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await rightClickDirectory("docs");
		await userEvent.click(screen.getByText("Open in terminal"));

		await waitFor(() => {
			expect(toastErrorSpy).toHaveBeenCalled();
		});

		toastErrorSpy.mockRestore();
	});

	it("hides 'Open in terminal' for remote S3 connections", async () => {
		useSettingsStore.setState({ externalTerminal: "kitty" });
		window.api.filesystem.remoteList = vi
			.fn()
			.mockResolvedValue([{ name: "data", isDirectory: true, fullPath: "/data", size: 0, modified: "" }]);
		window.api.terminal.openExternal = vi.fn().mockResolvedValue(undefined);

		render(
			<I18nWrapper>
				<FilePane type="remote" connectionId={5} initialPath="/" protocol="s3" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await rightClickDirectory("data");
		expect(screen.queryByText("Open in terminal")).not.toBeInTheDocument();
		expect(window.api.terminal.openExternal).not.toHaveBeenCalled();
	});

	// --- "Copy path to clipboard" context-menu action ---

	function stubClipboard(writeText: ReturnType<typeof vi.fn>) {
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			configurable: true,
		});
	}

	async function rightClickFile(fileName: string) {
		const file = await screen.findByText(fileName);
		fireEvent.contextMenu(file);
	}

	it("copies the right-clicked file's full path to the clipboard and shows a success toast", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		stubClipboard(writeText);
		const { toast } = await import("sonner");
		const toastSuccessSpy = vi.spyOn(toast, "success").mockImplementation(() => "");

		window.api.filesystem.list = vi
			.fn()
			.mockResolvedValue([
				{ name: "readme.md", isDirectory: false, fullPath: "/home/readme.md", size: 12, modified: "" },
			]);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await rightClickFile("readme.md");
		await userEvent.click(screen.getByText("Copy path to clipboard"));

		await waitFor(() => {
			expect(writeText).toHaveBeenCalledWith("/home/readme.md");
		});
		expect(toastSuccessSpy).toHaveBeenCalledWith("Path copied to clipboard");

		toastSuccessSpy.mockRestore();
	});

	it("shows an error toast when clipboard write rejects", async () => {
		const writeText = vi.fn().mockRejectedValue(new Error("permission denied"));
		stubClipboard(writeText);
		const { toast } = await import("sonner");
		const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");

		window.api.filesystem.list = vi
			.fn()
			.mockResolvedValue([
				{ name: "secret.txt", isDirectory: false, fullPath: "/home/secret.txt", size: 0, modified: "" },
			]);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await rightClickFile("secret.txt");
		await userEvent.click(screen.getByText("Copy path to clipboard"));

		await waitFor(() => {
			expect(toastErrorSpy).toHaveBeenCalledWith("Could not copy to clipboard");
		});
		expect(writeText).toHaveBeenCalledWith("/home/secret.txt");

		toastErrorSpy.mockRestore();
	});

	it("copies the right-clicked file's name to the clipboard and shows a success toast", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		stubClipboard(writeText);
		const { toast } = await import("sonner");
		const toastSuccessSpy = vi.spyOn(toast, "success").mockImplementation(() => "");

		window.api.filesystem.list = vi
			.fn()
			.mockResolvedValue([
				{ name: "readme.md", isDirectory: false, fullPath: "/home/readme.md", size: 12, modified: "" },
			]);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await rightClickFile("readme.md");
		await userEvent.click(screen.getByText("Copy filename"));

		await waitFor(() => {
			expect(writeText).toHaveBeenCalledWith("readme.md");
		});
		expect(toastSuccessSpy).toHaveBeenCalledWith("Filename copied to clipboard");

		toastSuccessSpy.mockRestore();
	});

	// --- toolbar toggle terminal button ---

	it("toggles the integrated terminal when toolbar toggle is clicked and no external is configured", async () => {
		useSettingsStore.setState({ externalTerminal: undefined });
		window.api.terminal.openExternal = vi.fn().mockResolvedValue(undefined);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);
		await waitForEntries();

		expect(screen.getByTitle("Toggle Terminal")).toBeInTheDocument();
		expect(window.api.terminal.openExternal).not.toHaveBeenCalled();

		await userEvent.click(screen.getByTitle("Toggle Terminal"));
		expect(window.api.terminal.openExternal).not.toHaveBeenCalled();
	});

	it("opens external terminal at current local path when toolbar toggle is clicked with external configured", async () => {
		useSettingsStore.setState({ externalTerminal: "kitty" });
		window.api.terminal.openExternal = vi.fn().mockResolvedValue(undefined);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home/user" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await userEvent.click(screen.getByTitle("Toggle Terminal"));
		expect(window.api.terminal.openExternal).toHaveBeenCalledWith(1, "/home/user", "local");
	});

	it("opens external terminal at current remote path when toolbar toggle is clicked with external configured", async () => {
		useSettingsStore.setState({ externalTerminal: "kitty" });
		window.api.filesystem.remoteList = vi.fn().mockResolvedValue([]);
		window.api.terminal.openExternal = vi.fn().mockResolvedValue(undefined);

		render(
			<I18nWrapper>
				<FilePane type="remote" connectionId={5} initialPath="/var/www" protocol="sftp" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await userEvent.click(screen.getByTitle("Toggle Terminal"));
		expect(window.api.terminal.openExternal).toHaveBeenCalledWith(5, "/var/www", "remote");
	});

	it("shows error toast when toolbar toggle external launch fails and no toggle occurs", async () => {
		useSettingsStore.setState({ externalTerminal: "kitty" });
		window.api.terminal.openExternal = vi.fn().mockRejectedValue(new Error("ENOENT"));
		const { toast } = await import("sonner");
		const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await userEvent.click(screen.getByTitle("Toggle Terminal"));
		await waitFor(() => {
			expect(toastErrorSpy).toHaveBeenCalled();
		});

		toastErrorSpy.mockRestore();
	});

	// --- "Rename" context-menu action (local panel — OPE-22) ---

	it("right-clicking a local file and selecting Rename shows an inline input pre-filled with the current name", async () => {
		window.api.filesystem.list = vi
			.fn()
			.mockResolvedValue([
				{ name: "readme.md", isDirectory: false, fullPath: "/home/readme.md", size: 12, modified: "" },
			]);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await rightClickFile("readme.md");
		await userEvent.click(screen.getByText("Rename"));

		const input = await screen.findByTestId("rename-input");
		expect((input as HTMLInputElement).value).toBe("readme.md");
	});

	it("commits the rename on Enter and calls filesystem.rename with old path and new name", async () => {
		const renameMock = vi.fn<(oldPath: string, newName: string) => Promise<void>>().mockResolvedValue(undefined);
		window.api.filesystem.list = vi
			.fn()
			.mockResolvedValue([
				{ name: "readme.md", isDirectory: false, fullPath: "/home/readme.md", size: 12, modified: "" },
			]);
		window.api.filesystem.rename = renameMock;

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await rightClickFile("readme.md");
		await userEvent.click(screen.getByText("Rename"));

		const input = await screen.findByTestId("rename-input");
		await userEvent.clear(input);
		await userEvent.type(input, "notes.md");
		await userEvent.keyboard("{Enter}");

		await waitFor(() => {
			expect(renameMock).toHaveBeenCalledWith("/home/readme.md", "notes.md");
		});
		expect(screen.queryByTestId("rename-input")).not.toBeInTheDocument();
	});

	it("cancels the rename on Escape and does not call filesystem.rename", async () => {
		const renameMock = vi.fn<(oldPath: string, newName: string) => Promise<void>>().mockResolvedValue(undefined);
		window.api.filesystem.list = vi
			.fn()
			.mockResolvedValue([
				{ name: "readme.md", isDirectory: false, fullPath: "/home/readme.md", size: 12, modified: "" },
			]);
		window.api.filesystem.rename = renameMock;

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await rightClickFile("readme.md");
		await userEvent.click(screen.getByText("Rename"));

		const input = await screen.findByTestId("rename-input");
		await userEvent.clear(input);
		await userEvent.type(input, "changed");
		await userEvent.keyboard("{Escape}");

		expect(renameMock).not.toHaveBeenCalled();
		expect(screen.queryByTestId("rename-input")).not.toBeInTheDocument();
	});

	it("reverts to the original name and shows a toast when the new name is invalid", async () => {
		const renameMock = vi.fn<(oldPath: string, newName: string) => Promise<void>>().mockResolvedValue(undefined);
		window.api.filesystem.list = vi
			.fn()
			.mockResolvedValue([
				{ name: "readme.md", isDirectory: false, fullPath: "/home/readme.md", size: 12, modified: "" },
			]);
		window.api.filesystem.rename = renameMock;
		const { toast } = await import("sonner");
		const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await rightClickFile("readme.md");
		await userEvent.click(screen.getByText("Rename"));

		const input = await screen.findByTestId("rename-input");
		await userEvent.clear(input);
		await userEvent.type(input, "bad/name");
		await userEvent.keyboard("{Enter}");

		expect(renameMock).not.toHaveBeenCalled();
		await waitFor(() => {
			expect(toastErrorSpy).toHaveBeenCalled();
		});
		expect(screen.queryByTestId("rename-input")).not.toBeInTheDocument();

		toastErrorSpy.mockRestore();
	});

	it("reverts to the original name and shows a toast when filesystem.rename rejects", async () => {
		const renameMock = vi
			.fn<(oldPath: string, newName: string) => Promise<void>>()
			.mockRejectedValue(new Error("EACCES: permission denied"));
		window.api.filesystem.list = vi
			.fn()
			.mockResolvedValue([
				{ name: "readme.md", isDirectory: false, fullPath: "/home/readme.md", size: 12, modified: "" },
			]);
		window.api.filesystem.rename = renameMock;
		const { toast } = await import("sonner");
		const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await rightClickFile("readme.md");
		await userEvent.click(screen.getByText("Rename"));

		const input = await screen.findByTestId("rename-input");
		await userEvent.clear(input);
		await userEvent.type(input, "renamed.md");
		await userEvent.keyboard("{Enter}");

		await waitFor(() => {
			expect(renameMock).toHaveBeenCalledWith("/home/readme.md", "renamed.md");
		});
		await waitFor(() => {
			expect(toastErrorSpy).toHaveBeenCalled();
		});
		expect(screen.queryByTestId("rename-input")).not.toBeInTheDocument();

		toastErrorSpy.mockRestore();
	});

	it("clears the selection after a successful rename (selection is keyed by name)", async () => {
		const renameMock = vi.fn<(oldPath: string, newName: string) => Promise<void>>().mockResolvedValue(undefined);
		window.api.filesystem.list = vi
			.fn()
			.mockResolvedValue([
				{ name: "readme.md", isDirectory: false, fullPath: "/home/readme.md", size: 12, modified: "" },
			]);
		window.api.filesystem.rename = renameMock;

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await userEvent.click(screen.getByText("readme.md"));
		expect(screen.getByText("readme.md").closest(".cursor-pointer")?.className).toContain("bg-primary-fixed-dim/20");

		await rightClickFile("readme.md");
		await userEvent.click(screen.getByText("Rename"));

		const input = await screen.findByTestId("rename-input");
		await userEvent.clear(input);
		await userEvent.type(input, "notes.md");
		await userEvent.keyboard("{Enter}");

		await waitFor(() => {
			expect(renameMock).toHaveBeenCalledWith("/home/readme.md", "notes.md");
		});
	});

	it("starts rename when F2 is pressed on a selected file", async () => {
		window.api.filesystem.list = vi
			.fn()
			.mockResolvedValue([
				{ name: "readme.md", isDirectory: false, fullPath: "/home/readme.md", size: 12, modified: "" },
			]);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await userEvent.click(screen.getByText("readme.md"));
		hotkeyCallbacks.get("f2")?.();

		const input = await screen.findByTestId("rename-input");
		expect((input as HTMLInputElement).value).toBe("readme.md");
	});

	it("does not start rename on F2 when no file is selected", async () => {
		window.api.filesystem.list = vi
			.fn()
			.mockResolvedValue([
				{ name: "readme.md", isDirectory: false, fullPath: "/home/readme.md", size: 12, modified: "" },
			]);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);
		await waitForEntries();

		hotkeyCallbacks.get("f2")?.();

		expect(screen.queryByTestId("rename-input")).not.toBeInTheDocument();
	});

	it("renames the last clicked file on F2 when multiple files are selected", async () => {
		window.api.filesystem.list = vi.fn().mockResolvedValue([
			{ name: "a.txt", isDirectory: false, fullPath: "/home/a.txt", size: 1, modified: "" },
			{ name: "b.txt", isDirectory: false, fullPath: "/home/b.txt", size: 1, modified: "" },
		]);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await userEvent.click(screen.getByText("a.txt"));
		fireEvent.click(screen.getByText("b.txt"), { ctrlKey: true });
		hotkeyCallbacks.get("f2")?.();

		const input = await screen.findByTestId("rename-input");
		expect((input as HTMLInputElement).value).toBe("b.txt");
	});

	it("does not start rename on F2 when already editing", async () => {
		window.api.filesystem.list = vi
			.fn()
			.mockResolvedValue([
				{ name: "readme.md", isDirectory: false, fullPath: "/home/readme.md", size: 12, modified: "" },
			]);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await rightClickFile("readme.md");
		await userEvent.click(screen.getByText("Rename"));
		await screen.findByTestId("rename-input");

		hotkeyCallbacks.get("f2")?.();
		await waitFor(() => {
			expect(screen.getAllByTestId("rename-input")).toHaveLength(1);
		});
	});

	it("calls remoteEdit.open when opening a remote file via context menu", async () => {
		window.api.filesystem.remoteList = vi
			.fn()
			.mockResolvedValue([
				{ name: "config.json", isDirectory: false, fullPath: "/etc/config.json", size: 256, modified: "" },
			]);
		window.api.remoteEdit.open = vi.fn().mockResolvedValue({ tempPath: "/tmp/config.json" });
		const { toast } = await import("sonner");
		const toastSuccessSpy = vi.spyOn(toast, "success").mockImplementation(() => "");

		render(
			<I18nWrapper>
				<FilePane type="remote" connectionId={3} initialPath="/etc" protocol="sftp" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await rightClickFile("config.json");
		await userEvent.click(screen.getByText("Open"));

		await waitFor(() => {
			expect(window.api.remoteEdit.open).toHaveBeenCalledWith(3, "/etc/config.json");
		});
		expect(toastSuccessSpy).toHaveBeenCalled();
		toastSuccessSpy.mockRestore();
	});

	it("shows error toast when remoteEdit.open fails", async () => {
		window.api.filesystem.remoteList = vi
			.fn()
			.mockResolvedValue([{ name: "data.csv", isDirectory: false, fullPath: "/data.csv", size: 1024, modified: "" }]);
		window.api.remoteEdit.open = vi.fn().mockRejectedValue(new Error("download failed"));
		const { toast } = await import("sonner");
		const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");

		render(
			<I18nWrapper>
				<FilePane type="remote" connectionId={3} initialPath="/" protocol="sftp" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await rightClickFile("data.csv");
		await userEvent.click(screen.getByText("Open"));

		await waitFor(() => {
			expect(toastErrorSpy).toHaveBeenCalled();
		});
		toastErrorSpy.mockRestore();
	});

	it("calls openPath when opening a local file via context menu", async () => {
		window.api.filesystem.list = vi
			.fn()
			.mockResolvedValue([
				{ name: "notes.txt", isDirectory: false, fullPath: "/home/notes.txt", size: 64, modified: "" },
			]);
		window.api.filesystem.openPath = vi.fn().mockResolvedValue(undefined);

		render(
			<I18nWrapper>
				<FilePane type="local" connectionId={1} initialPath="/home" />
			</I18nWrapper>,
		);
		await waitForEntries();

		await rightClickFile("notes.txt");
		await userEvent.click(screen.getByText("Open"));

		await waitFor(() => {
			expect(window.api.filesystem.openPath).toHaveBeenCalledWith("/home/notes.txt");
		});
	});
});
