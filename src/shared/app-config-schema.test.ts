import { describe, it, expect } from "vitest";

import {
	AppConfigSchema,
	ConnectionSchema,
	LastPathsSchema,
	SettingsSchema,
	TransferPanelsSchema,
} from "./app-config-schema";

describe("ConnectionSchema", () => {
	it("accepts a valid connection", () => {
		const result = ConnectionSchema.safeParse({
			id: 1,
			name: "Server",
			protocol: "sftp",
			host: "example.com",
			port: 22,
			username: "user",
			authType: "password",
			password: "pass",
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
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing id", () => {
		const result = ConnectionSchema.safeParse({ name: "Server" });
		expect(result.success).toBe(false);
	});
});

describe("LastPathsSchema", () => {
	it("accepts empty object", () => {
		const result = LastPathsSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it("accepts entries with local and remote", () => {
		const result = LastPathsSchema.safeParse({ "1": { local: "/home", remote: "/remote" } });
		expect(result.success).toBe(true);
	});

	it("accepts partial entries", () => {
		const result = LastPathsSchema.safeParse({ "1": { local: "/home" } });
		expect(result.success).toBe(true);
	});
});

describe("AppConfigSchema", () => {
	it("accepts empty config", () => {
		const result = AppConfigSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.connections).toEqual([]);
			expect(result.data.lastPaths).toEqual({});
			expect(result.data.transferPanels).toEqual({});
			expect(result.data.settings).toEqual({ theme: "system", locale: "en" });
		}
	});

	it("accepts full config", () => {
		const data = {
			connections: [
				{
					id: 1,
					name: "Server",
					protocol: "sftp",
					host: "example.com",
					port: 22,
					username: "user",
					authType: "password",
					password: "pass",
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
				},
			],
			lastPaths: { "1": { local: "/home" } },
			transferPanels: { "1": { visible: true } },
			settings: { theme: "dark", locale: "es" },
		};
		const result = AppConfigSchema.safeParse(data);
		expect(result.success).toBe(true);
	});

	it("rejects extra properties", () => {
		const result = AppConfigSchema.safeParse({ unknownField: true });
		expect(result.success).toBe(false);
	});

	it("rejects invalid connection inside connections", () => {
		const result = AppConfigSchema.safeParse({ connections: [{ id: "not-a-number" }] });
		expect(result.success).toBe(false);
	});
});

describe("SettingsSchema", () => {
	it("accepts settings with no externalTerminal", () => {
		const result = SettingsSchema.safeParse({ theme: "system", locale: "en" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.externalTerminal).toBeUndefined();
		}
	});

	it("accepts each supported externalTerminal value", () => {
		const ids = [
			"windows-terminal",
			"kitty",
			"ghostty",
			"alacritty",
			"iterm2",
			"terminal-app",
			"gnome-terminal",
			"konsole",
		] as const;
		for (const id of ids) {
			const result = SettingsSchema.safeParse({ theme: "system", locale: "en", externalTerminal: id });
			expect(result.success).toBe(true);
		}
	});

	it("rejects unknown externalTerminal value", () => {
		const result = SettingsSchema.safeParse({ theme: "system", locale: "en", externalTerminal: "hyper" });
		expect(result.success).toBe(false);
	});
});

describe("TransferPanelsSchema", () => {
	it("accepts empty object", () => {
		const result = TransferPanelsSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it("accepts entries with visible boolean", () => {
		const result = TransferPanelsSchema.safeParse({ "1": { visible: true } });
		expect(result.success).toBe(true);
	});

	it("rejects entry without visible", () => {
		const result = TransferPanelsSchema.safeParse({ "1": {} });
		expect(result.success).toBe(false);
	});

	it("rejects non-boolean visible", () => {
		const result = TransferPanelsSchema.safeParse({ "1": { visible: "yes" } });
		expect(result.success).toBe(false);
	});
});
