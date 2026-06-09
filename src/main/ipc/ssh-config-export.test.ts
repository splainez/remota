import type { Connection } from "@shared/types";
import { describe, expect, it } from "vitest";

import { connectionsToSshConfig } from "./ssh-config-export";

function makeConnection(overrides: Partial<Connection> = {}): Connection {
	return {
		id: 1,
		name: "myserver",
		protocol: "sftp",
		host: "192.168.1.100",
		port: 22,
		username: "admin",
		authType: "agent",
		password: "",
		privateKeyPath: "",
		accessKey: "",
		secretKey: "",
		region: "",
		bucket: "",
		endpoint: "",
		useHttps: true,
		groupName: "",
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
		...overrides,
	};
}

describe("connectionsToSshConfig", () => {
	it("returns empty string for empty array", () => {
		expect(connectionsToSshConfig([])).toBe("");
	});

	it("generates a basic Host block", () => {
		const config = connectionsToSshConfig([makeConnection()]);
		expect(config).toContain("Host myserver");
		expect(config).toContain("HostName 192.168.1.100");
		expect(config).toContain("User admin");
	});

	it("omits Port when default (22)", () => {
		const config = connectionsToSshConfig([makeConnection({ port: 22 })]);
		expect(config).not.toContain("Port");
	});

	it("includes Port when non-default", () => {
		const config = connectionsToSshConfig([makeConnection({ port: 2222 })]);
		expect(config).toContain("Port 2222");
	});

	it("omits HostName when same as name", () => {
		const config = connectionsToSshConfig([makeConnection({ name: "myserver", host: "myserver" })]);
		expect(config).not.toContain("HostName");
	});

	it("omits User when empty", () => {
		const config = connectionsToSshConfig([makeConnection({ username: "" })]);
		expect(config).not.toContain("User");
	});

	it("includes IdentityFile for key auth with path", () => {
		const config = connectionsToSshConfig([makeConnection({ authType: "key", privateKeyPath: "~/.ssh/id_rsa" })]);
		expect(config).toContain("IdentityFile ~/.ssh/id_rsa");
	});

	it("omits IdentityFile for agent auth", () => {
		const config = connectionsToSshConfig([makeConnection({ authType: "agent" })]);
		expect(config).not.toContain("IdentityFile");
	});

	it("omits IdentityFile for password auth", () => {
		const config = connectionsToSshConfig([makeConnection({ authType: "password", privateKeyPath: "" })]);
		expect(config).not.toContain("IdentityFile");
	});

	it("filters out S3 connections", () => {
		const config = connectionsToSshConfig([
			makeConnection({ name: "s3bucket", protocol: "s3" }),
			makeConnection({ name: "real-server" }),
		]);
		expect(config).not.toContain("s3bucket");
		expect(config).toContain("Host real-server");
	});

	it("generates multiple Host blocks", () => {
		const config = connectionsToSshConfig([
			makeConnection({ name: "server1", host: "10.0.0.1" }),
			makeConnection({ name: "server2", host: "10.0.0.2", port: 2222 }),
		]);
		expect(config).toContain("Host server1");
		expect(config).toContain("Host server2");
		expect(config).toContain("Port 2222");
	});

	it("handles SCP connections", () => {
		const config = connectionsToSshConfig([makeConnection({ protocol: "scp" })]);
		expect(config).toContain("Host myserver");
	});

	it("handles password auth without key", () => {
		const config = connectionsToSshConfig([makeConnection({ authType: "password", privateKeyPath: "" })]);
		expect(config).not.toContain("IdentityFile");
		expect(config).toContain("Host myserver");
	});
});
