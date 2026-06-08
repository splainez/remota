import { describe, expect, it } from "vitest";

import { parseSshConfigToConnections } from "./ssh-config-import";

describe("parseSshConfigToConnections", () => {
	it("parses a basic SSH config with one host", () => {
		const config = `
Host myserver
  HostName 192.168.1.100
  User admin
  Port 22
`;
		const result = parseSshConfigToConnections(config);
		expect(result.errors).toHaveLength(0);
		expect(result.connections).toHaveLength(1);
		expect(result.connections[0]).toEqual({
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
		});
	});

	it("parses multiple hosts", () => {
		const config = `
Host server1
  HostName 10.0.0.1
  User root

Host server2
  HostName 10.0.0.2
  User deploy
  Port 2222
`;
		const result = parseSshConfigToConnections(config);
		expect(result.errors).toHaveLength(0);
		expect(result.connections).toHaveLength(2);
		expect(result.connections[0].name).toBe("server1");
		expect(result.connections[0].host).toBe("10.0.0.1");
		expect(result.connections[1].name).toBe("server2");
		expect(result.connections[1].port).toBe(2222);
	});

	it("skips wildcard Host entries", () => {
		const config = `
Host *
  ForwardAgent yes

Host myserver
  HostName example.com
  User admin
`;
		const result = parseSshConfigToConnections(config);
		expect(result.errors).toHaveLength(0);
		expect(result.connections).toHaveLength(1);
		expect(result.connections[0].name).toBe("myserver");
	});

	it("uses Host as host when HostName is missing", () => {
		const config = `
Host myserver
  User admin
`;
		const result = parseSshConfigToConnections(config);
		expect(result.errors).toHaveLength(0);
		expect(result.connections[0].host).toBe("myserver");
	});

	it("defaults port to 22 when Port is missing", () => {
		const config = `
Host myserver
  HostName example.com
  User admin
`;
		const result = parseSshConfigToConnections(config);
		expect(result.connections[0].port).toBe(22);
	});

	it("defaults username to empty string when User is missing", () => {
		const config = `
Host myserver
  HostName example.com
`;
		const result = parseSshConfigToConnections(config);
		expect(result.connections[0].username).toBe("");
	});

	it("sets authType to key when IdentityFile is present", () => {
		const config = `
Host myserver
  HostName example.com
  User admin
  IdentityFile ~/.ssh/id_rsa
`;
		const result = parseSshConfigToConnections(config);
		expect(result.connections[0].authType).toBe("key");
		expect(result.connections[0].privateKeyPath).toBe("~/.ssh/id_rsa");
	});

	it("sets authType to agent when no IdentityFile", () => {
		const config = `
Host myserver
  HostName example.com
  User admin
`;
		const result = parseSshConfigToConnections(config);
		expect(result.connections[0].authType).toBe("agent");
	});

	it("handles IdentityFile with multiple paths (uses first)", () => {
		const config = `
Host myserver
  HostName example.com
  IdentityFile ~/.ssh/id_rsa
  IdentityFile ~/.ssh/id_ed25519
`;
		const result = parseSshConfigToConnections(config);
		expect(result.connections[0].privateKeyPath).toBe("~/.ssh/id_rsa");
	});

	it("skips entries with no Host directive", () => {
		const config = `
# just a comment
  ForwardAgent yes
`;
		const result = parseSshConfigToConnections(config);
		expect(result.connections).toHaveLength(0);
		expect(result.errors).toHaveLength(0);
	});

	it("returns empty for empty config", () => {
		const result = parseSshConfigToConnections("");
		expect(result.connections).toHaveLength(0);
		expect(result.errors).toHaveLength(0);
	});

	it("skips Match sections", () => {
		const config = `
Match exec "test -f /etc/firewall"
  HostName firewall.local

Host myserver
  HostName example.com
  User admin
`;
		const result = parseSshConfigToConnections(config);
		expect(result.connections).toHaveLength(1);
		expect(result.connections[0].name).toBe("myserver");
	});

	it("handles quoted Host values", () => {
		const config = `
Host "my server"
  HostName example.com
  User admin
`;
		const result = parseSshConfigToConnections(config);
		expect(result.errors).toHaveLength(0);
		expect(result.connections[0].name).toBe("my server");
	});

	it("parses Port as integer", () => {
		const config = `
Host myserver
  HostName example.com
  Port 2222
`;
		const result = parseSshConfigToConnections(config);
		expect(result.connections[0].port).toBe(2222);
	});

	it("handles multiple hosts with mixed directives", () => {
		const config = `
Host prod
  HostName prod.example.com
  User deploy
  Port 22
  IdentityFile ~/.ssh/prod_key

Host staging
  HostName staging.example.com
  User admin
  Port 2222

Host dev
  HostName dev.local
  User dev
`;
		const result = parseSshConfigToConnections(config);
		expect(result.errors).toHaveLength(0);
		expect(result.connections).toHaveLength(3);

		expect(result.connections[0].authType).toBe("key");
		expect(result.connections[0].privateKeyPath).toBe("~/.ssh/prod_key");

		expect(result.connections[1].port).toBe(2222);
		expect(result.connections[1].authType).toBe("agent");

		expect(result.connections[2].host).toBe("dev.local");
	});

	it("handles Host with multiple aliases (uses first value)", () => {
		const config = `
Host alias1 alias2 myserver
  HostName example.com
  User admin
`;
		const result = parseSshConfigToConnections(config);
		expect(result.errors).toHaveLength(0);
		expect(result.connections).toHaveLength(1);
		expect(result.connections[0].name).toBe("alias1");
	});
});
