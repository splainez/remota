import { describe, it, expect, beforeEach } from "vitest";
import { useAppNavigation, type AppView } from "./appNavigation";
import type { Connection } from "../../shared/types";

function makeConnection(overrides: Partial<Connection> = {}): Connection {
	return {
		id: 1,
		name: "Test Server",
		protocol: "sftp",
		host: "example.com",
		port: 22,
		username: "user",
		authType: "password",
		password: "",
		privateKeyPath: "",
		accessKey: "",
		secretKey: "",
		region: "us-east-1",
		bucket: "",
		endpoint: "",
		useHttps: true,
		groupName: "",
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
		...overrides,
	};
}

describe("useAppNavigation", () => {
	beforeEach(() => {
		useAppNavigation.setState({ currentView: { view: "connectionList" } });
	});

	it("initializes with connectionList view", () => {
		const state = useAppNavigation.getState();
		expect(state.currentView).toEqual({ view: "connectionList" });
	});

	it("setView updates the current view", () => {
		const newView: AppView = { view: "empty" };
		useAppNavigation.getState().setView(newView);
		expect(useAppNavigation.getState().currentView).toEqual(newView);
	});

	it("openConnectionList sets view to connectionList", () => {
		useAppNavigation.getState().setView({ view: "empty" });
		useAppNavigation.getState().openConnectionList();
		expect(useAppNavigation.getState().currentView).toEqual({ view: "connectionList" });
	});

	it("openConnectionDetail sets view with id", () => {
		useAppNavigation.getState().openConnectionDetail(42);
		expect(useAppNavigation.getState().currentView).toEqual({ view: "connectionDetail", id: 42 });
	});

	it("openConnectionForm sets view with mode and optional id", () => {
		useAppNavigation.getState().openConnectionForm("new");
		expect(useAppNavigation.getState().currentView).toEqual({ view: "connectionForm", mode: "new" });

		useAppNavigation.getState().openConnectionForm("edit", 10);
		expect(useAppNavigation.getState().currentView).toEqual({ view: "connectionForm", mode: "edit", id: 10 });
	});

	it("openFileBrowser sets view with connection", () => {
		const conn = makeConnection({ id: 5, name: "My Server" });
		useAppNavigation.getState().openFileBrowser(conn);
		expect(useAppNavigation.getState().currentView).toEqual({ view: "fileBrowser", connection: conn });
	});

	it("goBack resets to connectionList", () => {
		useAppNavigation.getState().openFileBrowser(makeConnection());
		useAppNavigation.getState().goBack();
		expect(useAppNavigation.getState().currentView).toEqual({ view: "connectionList" });
	});
});
