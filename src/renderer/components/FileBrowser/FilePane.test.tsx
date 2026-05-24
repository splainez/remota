import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

	it("renders toolbar with back, forward, up and refresh buttons", () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home/user" isMocked={true} />
		);
		expect(screen.getByTitle("Back")).toBeInTheDocument();
		expect(screen.getByTitle("Forward")).toBeInTheDocument();
		expect(screen.getByTitle("Parent Directory")).toBeInTheDocument();
		expect(screen.getByTitle("Refresh")).toBeInTheDocument();
	});

	it("initializes navigation history with initialPath", () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home/user" isMocked={true} />
		);
		const store = useNavigationStore.getState();
		expect(store.panes.local.entries).toEqual(["/home/user"]);
		expect(store.panes.local.index).toBe(0);
	});

	it("clears and re-initializes history on connection change", () => {
		const { rerender } = render(
			<FilePane type="local" connectionId={1} initialPath="/home/user" isMocked={true} />
		);
		flushStore();
		rerender(
			<FilePane type="local" connectionId={2} initialPath="/var/log" isMocked={true} />
		);
		const store = useNavigationStore.getState();
		expect(store.panes.local.entries).toEqual(["/var/log"]);
		expect(store.panes.local.index).toBe(0);
	});

	it("navigates back after entering a directory", async () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home" isMocked={true} />
		);

		const adminDir = screen.getByText("admin");
		await userEvent.dblClick(adminDir);

		const store = useNavigationStore.getState();
		expect(store.panes.local.entries).toEqual(["/home", "/home/admin"]);
		expect(store.canGoBack("local")).toBe(true);

		await userEvent.click(screen.getByTitle("Back"));
		expect(useNavigationStore.getState().panes.local.index).toBe(0);
	});

	it("navigates forward after going back", async () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home" isMocked={true} />
		);

		const adminDir = screen.getByText("admin");
		await userEvent.dblClick(adminDir);

		await userEvent.click(screen.getByTitle("Back"));

		const store = useNavigationStore.getState();
		expect(store.canGoForward("local")).toBe(true);

		await userEvent.click(screen.getByTitle("Forward"));
		expect(useNavigationStore.getState().panes.local.index).toBe(1);
	});

	it("back button is disabled with no history", () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home/user" isMocked={true} />
		);
		expect(screen.getByTitle("Back")).toBeDisabled();
		expect(screen.getByTitle("Forward")).toBeDisabled();
	});

	it("calls goBack on mouse button 4 (back)", () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home" isMocked={true} />
		);

		useNavigationStore.getState().push("local", "/home/user");
		useNavigationStore.getState().push("local", "/home/user/docs");

		const pane = document.querySelector(".flex-1.flex.flex-col.overflow-hidden");
		if (!pane) throw new Error("Pane element not found");
		const event = new MouseEvent("mousedown", { button: 3, bubbles: true, cancelable: true });
		pane.dispatchEvent(event);

		expect(useNavigationStore.getState().panes.local.index).toBe(1);
	});

	it("calls goForward on mouse button 5 (forward)", () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home" isMocked={true} />
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
			<FilePane type="local" connectionId={1} initialPath="/home" isMocked={true} />
		);

		useNavigationStore.getState().push("local", "/home/user");

		const pane = document.querySelector(".flex-1.flex.flex-col.overflow-hidden");
		if (!pane) throw new Error("Pane element not found");
		const event = new MouseEvent("mousedown", { button: 0, bubbles: true, cancelable: true });
		pane.dispatchEvent(event);

		expect(useNavigationStore.getState().panes.local.index).toBe(1);
	});

	// --- selection ---

	const waitForEntries = async () => {
		await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());
	};

	it("selects an entry on single click", async () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home/admin" isMocked={true} />
		);
		await waitForEntries();

		await userEvent.click(screen.getByText("projects"));
		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).toContain("bg-blue-200");
		expect(screen.getByText("backups").closest(".cursor-pointer")?.className).not.toContain("bg-blue-200");
	});

	it("clears previous selection on plain click", async () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home/admin" isMocked={true} />
		);
		await waitForEntries();
		const user = userEvent.setup();

		await user.click(screen.getByText("projects"));
		await user.keyboard("{Control>}");
		await user.click(screen.getByText("backups"));
		await user.keyboard("{/Control}");
		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).toContain("bg-blue-200");
		expect(screen.getByText("backups").closest(".cursor-pointer")?.className).toContain("bg-blue-200");

		await user.click(screen.getByText("notes.txt"));
		expect(screen.getByText("notes.txt").closest(".cursor-pointer")?.className).toContain("bg-blue-200");
		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).not.toContain("bg-blue-200");
		expect(screen.getByText("backups").closest(".cursor-pointer")?.className).not.toContain("bg-blue-200");
	});

	it("toggles entries with Ctrl+click", async () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home/admin" isMocked={true} />
		);
		await waitForEntries();
		const user = userEvent.setup();

		await user.click(screen.getByText("projects"));
		await user.keyboard("{Control>}");
		await user.click(screen.getByText("backups"));
		await user.keyboard("{/Control}");

		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).toContain("bg-blue-200");
		expect(screen.getByText("backups").closest(".cursor-pointer")?.className).toContain("bg-blue-200");

		await user.keyboard("{Control>}");
		await user.click(screen.getByText("projects"));
		await user.keyboard("{/Control}");

		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).not.toContain("bg-blue-200");
		expect(screen.getByText("backups").closest(".cursor-pointer")?.className).toContain("bg-blue-200");
	});

	it("selects a range with Shift+click", async () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home/admin" isMocked={true} />
		);
		await waitForEntries();
		const user = userEvent.setup();

		await user.click(screen.getByText("projects"));
		await user.keyboard("{Shift>}");
		await user.click(screen.getByText("notes.txt"));
		await user.keyboard("{/Shift}");

		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).toContain("bg-blue-200");
		expect(screen.getByText("config.json").closest(".cursor-pointer")?.className).toContain("bg-blue-200");
		expect(screen.getByText("notes.txt").closest(".cursor-pointer")?.className).toContain("bg-blue-200");
		expect(screen.getByText("backups").closest(".cursor-pointer")?.className).not.toContain("bg-blue-200");
	});

	it("uses first entry as anchor when Shift+click with no prior selection", async () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home/admin" isMocked={true} />
		);
		await waitForEntries();
		const user = userEvent.setup();

		await user.keyboard("{Shift>}");
		await user.click(screen.getByText("config.json"));
		await user.keyboard("{/Shift}");

		expect(screen.getByText("backups").closest(".cursor-pointer")?.className).toContain("bg-blue-200");
		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).toContain("bg-blue-200");
		expect(screen.getByText("config.json").closest(".cursor-pointer")?.className).toContain("bg-blue-200");
		expect(screen.getByText("notes.txt").closest(".cursor-pointer")?.className).not.toContain("bg-blue-200");
	});

	it("clears selection on navigate back", async () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home/admin" isMocked={true} />
		);
		await waitForEntries();

		await userEvent.click(screen.getByText("projects"));
		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).toContain("bg-blue-200");

		await userEvent.dblClick(screen.getByText("projects"));
		await userEvent.click(screen.getByTitle("Back"));

		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).not.toContain("bg-blue-200");
	});

	it("clears selection on navigate forward", async () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home/admin" isMocked={true} />
		);
		await waitForEntries();
		const user = userEvent.setup();

		await user.dblClick(screen.getByText("projects"));
		await user.click(screen.getByText("webapp"));
		expect(screen.getByText("webapp").closest(".cursor-pointer")?.className).toContain("bg-blue-200");

		await user.click(screen.getByTitle("Back"));
		await user.click(screen.getByTitle("Forward"));

		expect(screen.getByText("webapp").closest(".cursor-pointer")?.className).not.toContain("bg-blue-200");
	});

	it("clears selection on navigate up", async () => {
		render(
			<FilePane type="local" connectionId={1} initialPath="/home/admin" isMocked={true} />
		);
		await waitForEntries();

		await userEvent.click(screen.getByText("projects"));
		expect(screen.getByText("projects").closest(".cursor-pointer")?.className).toContain("bg-blue-200");

		await userEvent.click(screen.getByTitle("Parent Directory"));

		expect(screen.getByText("admin").closest(".cursor-pointer")?.className).not.toContain("bg-blue-200");
		expect(screen.getByText("deploy").closest(".cursor-pointer")?.className).not.toContain("bg-blue-200");
	});
});
