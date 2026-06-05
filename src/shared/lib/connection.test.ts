import type { Connection } from "@shared/types";
import { describe, it, expect } from "vitest";

import { connectionSupportsTerminal } from "./connection";

function makeConnection(overrides: Partial<Connection> = {}): Connection {
	return {
		id: 1,
		name: "Test",
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

describe("connectionSupportsTerminal", () => {
	it("returns true for SFTP connections", () => {
		expect(connectionSupportsTerminal(makeConnection({ protocol: "sftp" }))).toBe(true);
	});

	it("returns true for SCP connections", () => {
		expect(connectionSupportsTerminal(makeConnection({ protocol: "scp" }))).toBe(true);
	});

	it("returns false for S3 connections", () => {
		expect(connectionSupportsTerminal(makeConnection({ protocol: "s3" }))).toBe(false);
	});
});
