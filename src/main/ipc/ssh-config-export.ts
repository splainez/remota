import type { Connection } from "@shared/types";

export function connectionsToSshConfig(connections: Connection[]): string {
	const sshConnections = connections.filter((c) => c.protocol === "sftp" || c.protocol === "scp");

	if (sshConnections.length === 0) {
		return "";
	}

	const blocks: string[] = [];

	for (const conn of sshConnections) {
		const lines: string[] = [`Host ${conn.name}`];
		if (conn.host !== conn.name) {
			lines.push(`  HostName ${conn.host}`);
		}
		if (conn.port !== 22) {
			lines.push(`  Port ${String(conn.port)}`);
		}
		if (conn.username) {
			lines.push(`  User ${conn.username}`);
		}
		if (conn.authType === "key" && conn.privateKeyPath) {
			lines.push(`  IdentityFile ${conn.privateKeyPath}`);
		}
		blocks.push(lines.join("\n"));
	}

	return blocks.join("\n\n");
}
