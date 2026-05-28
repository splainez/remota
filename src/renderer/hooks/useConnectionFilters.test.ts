import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useConnectionFilters, groupConnections } from "./useConnectionFilters";
import type { Connection } from "../../shared/types";

function makeConnection(id: number, name: string, groupName: string, host: string, username: string): Connection {
	return {
		id,
		name,
		host,
		port: 22,
		username,
		protocol: "sftp" as const,
		authType: "password" as const,
		password: "",
		privateKeyPath: "",
		accessKey: "",
		secretKey: "",
		region: "us-east-1",
		bucket: "",
		endpoint: "",
		useHttps: true,
		groupName,
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
	};
}

describe("groupConnections", () => {
	it("groups connections by groupName", () => {
		const connections = [
			makeConnection(1, "A", "Work", "a.com", "user1"),
			makeConnection(2, "B", "Work", "b.com", "user2"),
			makeConnection(3, "C", "Personal", "c.com", "user3"),
		];
		const groups = groupConnections(connections);
		expect(groups.get("Work")?.length).toBe(2);
		expect(groups.get("Personal")?.length).toBe(1);
	});

	it("uses 'Uncategorized' for empty group name", () => {
		const connections = [makeConnection(1, "A", "", "a.com", "user1")];
		const groups = groupConnections(connections);
		expect(groups.has("Uncategorized")).toBe(true);
	});

	it("uses 'Uncategorized' for whitespace-only group name", () => {
		const connections = [makeConnection(1, "A", "   ", "a.com", "user1")];
		const groups = groupConnections(connections);
		expect(groups.has("Uncategorized")).toBe(true);
	});

	it("returns empty map for no connections", () => {
		const groups = groupConnections([]);
		expect(groups.size).toBe(0);
	});
});

describe("useConnectionFilters", () => {
	const connections: Connection[] = [
		makeConnection(1, "Alpha Server", "Work", "alpha.com", "admin"),
		makeConnection(2, "Beta Server", "Work", "beta.com", "dev"),
		makeConnection(3, "Home Pi", "Personal", "pi.local", "pi"),
		makeConnection(4, "S3 Backup", "Personal", "s3.amazonaws.com", "accesskey"),
	];

	it("returns all connections when search is empty", () => {
		const { result } = renderHook(() => useConnectionFilters(connections));
		expect(result.current.filtered).toHaveLength(4);
	});

	it("filters connections by name", () => {
		const { result } = renderHook(() => useConnectionFilters(connections));
		act(() => {
			result.current.setSearch("Alpha");
		});
		expect(result.current.filtered).toHaveLength(1);
		expect(result.current.filtered[0].name).toBe("Alpha Server");
	});

	it("filters connections by host", () => {
		const { result } = renderHook(() => useConnectionFilters(connections));
		act(() => {
			result.current.setSearch("pi.local");
		});
		expect(result.current.filtered).toHaveLength(1);
		expect(result.current.filtered[0].name).toBe("Home Pi");
	});

	it("filters connections by username", () => {
		const { result } = renderHook(() => useConnectionFilters(connections));
		act(() => {
			result.current.setSearch("admin");
		});
		expect(result.current.filtered).toHaveLength(1);
		expect(result.current.filtered[0].name).toBe("Alpha Server");
	});

	it("search is case insensitive", () => {
		const { result } = renderHook(() => useConnectionFilters(connections));
		act(() => {
			result.current.setSearch("alpha");
		});
		expect(result.current.filtered).toHaveLength(1);
	});

	it("groups filtered connections", () => {
		const { result } = renderHook(() => useConnectionFilters(connections));
		expect(result.current.groups).toHaveLength(2);
		const groupNames = result.current.groups.map(([name]) => name).sort();
		expect(groupNames).toEqual(["Personal", "Work"]);
	});

	it("toggles group collapse", () => {
		const { result } = renderHook(() => useConnectionFilters(connections));
		act(() => {
			result.current.toggleGroup("Work");
		});
		expect(result.current.collapsedGroups).toEqual(new Set(["Work"]));

		act(() => {
			result.current.toggleGroup("Work");
		});
		expect(result.current.collapsedGroups).toEqual(new Set());
	});

	it("returns no groups when no connections at all", () => {
		const { result } = renderHook(() => useConnectionFilters([]));
		expect(result.current.groups).toHaveLength(0);
		expect(result.current.filtered).toHaveLength(0);
	});
});
