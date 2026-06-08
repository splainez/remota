import type { NewConnection } from "@shared/types";
import SSHConfig from "ssh-config";

export interface SshConfigParseResult {
	connections: NewConnection[];
	errors: string[];
}

function getStringValue(value: string | { val: string; separator: string; quoted?: boolean }[]): string {
	if (typeof value === "string") return value;
	if (Array.isArray(value) && value.length > 0) return value[0].val;
	return "";
}

export function parseSshConfigToConnections(configText: string): SshConfigParseResult {
	const connections: NewConnection[] = [];
	const errors: string[] = [];

	if (!configText.trim()) {
		return { connections, errors };
	}

	let config: SSHConfig;
	try {
		config = SSHConfig.parse(configText);
	} catch (err) {
		errors.push(`Failed to parse SSH config: ${(err as Error).message}`);
		return { connections, errors };
	}

	for (const line of config) {
		if (line.type !== SSHConfig.DIRECTIVE) continue;
		if (line.param !== "Host") continue;

		const hostValue = getStringValue(line.value);
		const hostNames = Array.isArray(line.value) ? line.value.map((v) => v.val).filter(Boolean) : [hostValue];
		if (hostNames.length === 0) continue;
		const name = hostNames[0];
		if (name === "*") continue;

		const resolved = config.compute(name);

		const hostName = typeof resolved.HostName === "string" ? resolved.HostName : name;
		const port = typeof resolved.Port === "string" ? Number.parseInt(resolved.Port, 10) : 22;
		const user = typeof resolved.User === "string" ? resolved.User : "";
		const identityFile = Array.isArray(resolved.IdentityFile)
			? resolved.IdentityFile[0]
			: typeof resolved.IdentityFile === "string"
				? resolved.IdentityFile
				: "";

		connections.push({
			name,
			protocol: "sftp",
			host: hostName,
			port: Number.isFinite(port) ? port : 22,
			username: user,
			authType: identityFile ? "key" : "agent",
			password: "",
			privateKeyPath: identityFile,
			accessKey: "",
			secretKey: "",
			region: "",
			bucket: "",
			endpoint: "",
			useHttps: true,
			groupName: "",
		});
	}

	return { connections, errors };
}
