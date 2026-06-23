import { createMockApi } from "@renderer/test/setup";
import type { Connection } from "@shared/types";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSelectedConnection, useConnectionsStore } from "./connections";

function makeConn(overrides: Partial<Connection> = {}): Connection {
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

function createApi(
	overrides: {
		list?: ReturnType<typeof vi.fn>;
		create?: ReturnType<typeof vi.fn>;
		update?: ReturnType<typeof vi.fn>;
		delete?: ReturnType<typeof vi.fn>;
	} = {},
) {
	const list = overrides.list ?? vi.fn().mockResolvedValue([]);
	const create =
		overrides.create ?? vi.fn().mockImplementation((data) => Promise.resolve(makeConn(data as Partial<Connection>)));
	const update =
		overrides.update ?? vi.fn().mockImplementation((data) => Promise.resolve(makeConn(data as Partial<Connection>)));
	const del = overrides.delete ?? vi.fn().mockResolvedValue(true);
	vi.stubGlobal(
		"api",
		createMockApi({
			connections: {
				list: list as unknown as () => Promise<Connection[]>,
				create: create as unknown as (
					data: Parameters<ReturnType<typeof createMockApi>["connections"]["create"]>[0],
				) => Promise<Connection>,
				update: update as unknown as (
					data: Parameters<ReturnType<typeof createMockApi>["connections"]["update"]>[0],
				) => Promise<Connection | null>,
				delete: del as unknown as (id: number) => Promise<boolean>,
				get: vi.fn(),
				getRecent: vi.fn().mockResolvedValue([]),
				markRecent: vi.fn(),
				importSshConfig: vi.fn().mockResolvedValue({ imported: 0, errors: [] }),
				exportSshConfig: vi.fn().mockResolvedValue({ exported: 0, errors: [] }),
				selectKeyFile: vi.fn().mockResolvedValue(null),
			},
		}),
	);
	return { list, create, update, delete: del };
}

describe("useConnectionsStore", () => {
	beforeEach(() => {
		useConnectionsStore.setState({ connections: [], selectedId: null, loaded: false });
		vi.clearAllMocks();
	});

	it("starts with empty connections and loaded false", () => {
		const state = useConnectionsStore.getState();
		expect(state.connections).toEqual([]);
		expect(state.selectedId).toBeNull();
		expect(state.loaded).toBe(false);
	});

	it("load() fetches connections from IPC", async () => {
		const conns = [makeConn({ id: 1, name: "Server 1" }), makeConn({ id: 2, name: "Server 2" })];
		const { list } = createApi({ list: vi.fn().mockResolvedValue(conns) });

		await act(async () => {
			await useConnectionsStore.getState().load();
		});

		expect(list).toHaveBeenCalledOnce();
		const state = useConnectionsStore.getState();
		expect(state.connections).toHaveLength(2);
		expect(state.connections[0].name).toBe("Server 1");
		expect(state.loaded).toBe(true);
	});

	it("load() is a no-op when already loaded (StrictMode guard)", async () => {
		const conns = [makeConn({ id: 1, name: "Server 1" })];
		const { list } = createApi({ list: vi.fn().mockResolvedValue(conns) });

		await act(async () => {
			await useConnectionsStore.getState().load();
		});
		expect(list).toHaveBeenCalledOnce();

		await act(async () => {
			await useConnectionsStore.getState().load();
		});
		expect(list).toHaveBeenCalledOnce();
	});

	it("load() retries after failure", async () => {
		const listFn = vi
			.fn()
			.mockRejectedValueOnce(new Error("network"))
			.mockResolvedValueOnce([makeConn({ id: 1 })]);
		createApi({ list: listFn });

		await act(async () => {
			await useConnectionsStore.getState().load();
		});
		expect(useConnectionsStore.getState().loaded).toBe(false);
		expect(useConnectionsStore.getState().connections).toHaveLength(0);

		await act(async () => {
			await useConnectionsStore.getState().load();
		});
		expect(useConnectionsStore.getState().loaded).toBe(true);
		expect(useConnectionsStore.getState().connections).toHaveLength(1);
		expect(listFn).toHaveBeenCalledTimes(2);
	});

	it("create() calls IPC and refreshes list", async () => {
		const existing = [makeConn({ id: 1, name: "Server 1" })];
		const created = makeConn({ id: 2, name: "New Server" });
		const listFn = vi
			.fn()
			.mockResolvedValueOnce(existing)
			.mockResolvedValueOnce([...existing, created]);
		const { list, create } = createApi({
			list: listFn,
			create: vi.fn().mockResolvedValue(created),
		});

		await act(async () => {
			await useConnectionsStore.getState().load();
		});

		await act(async () => {
			await useConnectionsStore.getState().create({
				name: "New Server",
				protocol: "sftp",
				host: "new.com",
				port: 22,
				username: "",
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
			});
		});

		expect(create).toHaveBeenCalledOnce();
		expect(list).toHaveBeenCalledTimes(2);
		expect(useConnectionsStore.getState().connections[1].id).toBe(2);
	});

	it("create() falls back to optimistic update if list() fails", async () => {
		const created = makeConn({ id: 2, name: "New Server" });
		const { list, create } = createApi({
			list: vi.fn().mockRejectedValueOnce(new Error("network")),
			create: vi.fn().mockResolvedValue(created),
		});

		await act(async () => {
			await useConnectionsStore.getState().create({
				name: "New Server",
				protocol: "sftp",
				host: "new.com",
				port: 22,
				username: "",
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
			});
		});

		expect(create).toHaveBeenCalledOnce();
		expect(list).toHaveBeenCalledOnce();
		expect(useConnectionsStore.getState().connections).toHaveLength(1);
		expect(useConnectionsStore.getState().connections[0].id).toBe(2);
		expect(useConnectionsStore.getState().selectedId).toBe(2);
	});

	it("update() calls IPC and refreshes list", async () => {
		const existing = [makeConn({ id: 1, name: "Server 1" })];
		const { list, update } = createApi({
			list: vi.fn().mockResolvedValue(existing),
			update: vi.fn().mockResolvedValue(makeConn({ id: 1, name: "Updated" })),
		});

		await act(async () => {
			await useConnectionsStore.getState().load();
		});

		await act(async () => {
			await useConnectionsStore.getState().update({ id: 1, name: "Updated" });
		});

		expect(update).toHaveBeenCalledOnce();
		expect(list).toHaveBeenCalledTimes(2);
	});

	it("update() falls back to optimistic update if list() fails", async () => {
		const existing = [makeConn({ id: 1, name: "Server 1" })];
		createApi({
			list: vi.fn().mockResolvedValueOnce(existing).mockRejectedValueOnce(new Error("network")),
			update: vi.fn().mockResolvedValue(makeConn({ id: 1, name: "Updated" })),
		});

		await act(async () => {
			await useConnectionsStore.getState().load();
		});

		await act(async () => {
			await useConnectionsStore.getState().update({ id: 1, name: "Updated" });
		});

		const conn = useConnectionsStore.getState().connections.find((c) => c.id === 1);
		expect(conn?.name).toBe("Updated");
	});

	it("remove() calls IPC, refreshes list, and clears selection if removed id was selected", async () => {
		const existing = [makeConn({ id: 1, name: "Server 1" }), makeConn({ id: 2, name: "Server 2" })];
		const { delete: del } = createApi({
			list: vi.fn().mockResolvedValue(existing),
		});

		await act(async () => {
			await useConnectionsStore.getState().load();
		});

		act(() => {
			useConnectionsStore.getState().select(1);
		});

		await act(async () => {
			await useConnectionsStore.getState().remove(1);
		});

		expect(del).toHaveBeenCalledWith(1);
		expect(useConnectionsStore.getState().selectedId).toBeNull();
	});

	it("remove() does not clear selection when removed id is different", async () => {
		const existing = [makeConn({ id: 1, name: "Server 1" }), makeConn({ id: 2, name: "Server 2" })];
		createApi({
			list: vi.fn().mockResolvedValue(existing),
		});

		await act(async () => {
			await useConnectionsStore.getState().load();
		});

		act(() => {
			useConnectionsStore.getState().select(1);
		});

		await act(async () => {
			await useConnectionsStore.getState().remove(2);
		});

		expect(useConnectionsStore.getState().selectedId).toBe(1);
	});

	it("remove() falls back to optimistic update if list() fails", async () => {
		const existing = [makeConn({ id: 1, name: "Server 1" }), makeConn({ id: 2, name: "Server 2" })];
		createApi({
			list: vi.fn().mockResolvedValueOnce(existing).mockRejectedValueOnce(new Error("network")),
		});

		await act(async () => {
			await useConnectionsStore.getState().load();
		});

		await act(async () => {
			await useConnectionsStore.getState().remove(1);
		});

		expect(useConnectionsStore.getState().connections).toHaveLength(1);
		expect(useConnectionsStore.getState().connections[0].id).toBe(2);
	});

	it("select() sets selectedId", () => {
		act(() => {
			useConnectionsStore.getState().select(5);
		});
		expect(useConnectionsStore.getState().selectedId).toBe(5);
	});

	it("getSelectedConnection returns the connection matching selectedId", async () => {
		const conns = [makeConn({ id: 1, name: "Server 1" }), makeConn({ id: 2, name: "Server 2" })];
		createApi({ list: vi.fn().mockResolvedValue(conns) });

		await act(async () => {
			await useConnectionsStore.getState().load();
		});

		act(() => {
			useConnectionsStore.getState().select(2);
		});

		expect(getSelectedConnection(useConnectionsStore.getState())?.name).toBe("Server 2");
	});

	it("getSelectedConnection returns null when no selection", () => {
		expect(getSelectedConnection(useConnectionsStore.getState())).toBeNull();
	});

	it("multiple subscribers share the same state", async () => {
		const conns = [makeConn({ id: 1, name: "Server 1" })];
		const created = makeConn({ id: 2, name: "New Server" });
		const listFn = vi
			.fn()
			.mockResolvedValueOnce(conns)
			.mockResolvedValueOnce([...conns, created]);
		createApi({
			list: listFn,
			create: vi.fn().mockResolvedValue(created),
		});

		await act(async () => {
			await useConnectionsStore.getState().load();
		});

		expect(useConnectionsStore.getState().connections).toHaveLength(1);

		await act(async () => {
			await useConnectionsStore.getState().create({
				name: "New Server",
				protocol: "sftp",
				host: "new.com",
				port: 22,
				username: "",
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
			});
		});

		expect(useConnectionsStore.getState().connections).toHaveLength(2);
	});
});
