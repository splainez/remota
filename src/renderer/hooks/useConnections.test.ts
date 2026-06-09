import { createMockApi } from "@renderer/test/setup";
import type { Connection } from "@shared/types";
import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useConnections } from "./useConnections";

function makeConn(count: number): Connection[] {
	return Array.from({ length: count }, (_, i) => ({
		id: i + 1,
		name: `Server ${String(i + 1)}`,
		protocol: "sftp" as const,
		host: `server${String(i + 1)}.com`,
		port: 22,
		username: "user",
		authType: "password" as const,
		password: "",
		privateKeyPath: "",
		accessKey: "",
		secretKey: "",
		region: "us-east-1",
		bucket: "",
		endpoint: "",
		useHttps: true,
		groupName: "",
		createdAt: "",
		updatedAt: "",
	}));
}

describe("useConnections", () => {
	beforeEach(() => {
		const mockApi = createMockApi();
		vi.stubGlobal("api", mockApi);
	});

	it("initially returns loading state and empty connections", () => {
		const { result } = renderHook(() => useConnections());
		expect(result.current.loading).toBe(true);
		expect(result.current.connections).toEqual([]);
		expect(result.current.selected).toBeNull();
	});

	it("loads connections on mount", async () => {
		const existing = makeConn(2);
		const mockApi = createMockApi({
			connections: {
				list: vi.fn().mockResolvedValue(existing),
				get: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
				importSshConfig: vi.fn().mockResolvedValue({ imported: 0, errors: [] }),
				exportSshConfig: vi.fn().mockResolvedValue({ exported: 0, errors: [] }),
			},
		});
		vi.stubGlobal("api", mockApi);

		const { result } = renderHook(() => useConnections());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.connections).toHaveLength(2);
		expect(result.current.connections[0].name).toBe("Server 1");
	});

	it("select sets selectedId", async () => {
		const existing = makeConn(2);
		const mockApi = createMockApi({
			connections: {
				list: vi.fn().mockResolvedValue(existing),
				get: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
				importSshConfig: vi.fn().mockResolvedValue({ imported: 0, errors: [] }),
				exportSshConfig: vi.fn().mockResolvedValue({ exported: 0, errors: [] }),
			},
		});
		vi.stubGlobal("api", mockApi);

		const { result } = renderHook(() => useConnections());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		act(() => {
			result.current.select(2);
		});

		expect(result.current.selected).toEqual(existing[1]);
	});

	it("create adds a new connection", async () => {
		const existing = makeConn(1);
		const mockApi = createMockApi({
			connections: {
				list: vi.fn().mockResolvedValue(existing),
				get: vi.fn(),
				create: vi.fn().mockResolvedValue({
					id: 2,
					name: "New",
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
					createdAt: "",
					updatedAt: "",
				}),
				update: vi.fn(),
				delete: vi.fn(),
				importSshConfig: vi.fn().mockResolvedValue({ imported: 0, errors: [] }),
				exportSshConfig: vi.fn().mockResolvedValue({ exported: 0, errors: [] }),
			},
		});
		vi.stubGlobal("api", mockApi);

		const { result } = renderHook(() => useConnections());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		await act(async () => {
			await result.current.create({
				name: "New",
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

		expect(mockApi.connections.create).toHaveBeenCalledWith(expect.objectContaining({ host: "new.com" }));
	});

	it("remove deletes and clears selection if same id", async () => {
		const existing = makeConn(2);
		const mockApi = createMockApi({
			connections: {
				list: vi.fn().mockResolvedValue(existing),
				get: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn().mockResolvedValue(true),
				importSshConfig: vi.fn().mockResolvedValue({ imported: 0, errors: [] }),
				exportSshConfig: vi.fn().mockResolvedValue({ exported: 0, errors: [] }),
			},
		});
		vi.stubGlobal("api", mockApi);

		const { result } = renderHook(() => useConnections());

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		act(() => {
			result.current.select(1);
		});

		await act(async () => {
			await result.current.remove(1);
		});

		expect(mockApi.connections.delete).toHaveBeenCalledWith(1);
	});
});
