import { GenericContainer, Wait, type StartedTestContainer } from "testcontainers";

import { buildFileTreeCommands } from "./fixtures";
import type { ConnectionInfo } from "./types";

export interface StartedSftpContainer {
	container: StartedTestContainer;
	connection: ConnectionInfo;
}

export async function startSftpContainer(config?: Partial<ConnectionInfo>): Promise<StartedSftpContainer> {
	const username = config?.username ?? process.env.TEST_SFTP_USER ?? "testuser";
	const password = config?.password ?? process.env.TEST_SFTP_PASS ?? "testpass";

	const container = await new GenericContainer("atmoz/sftp")
		.withExposedPorts(22)
		.withEnvironment({
			SFTP_USERS: `${username}:${password}:::`,
		})
		.withWaitStrategy(Wait.forLogMessage(/Server listening on/, 1))
		.start();

	const host = container.getHost();
	const port = config?.port ?? container.getMappedPort(22);

	const home = `/home/${username}`;
	for (const cmd of buildFileTreeCommands(home)) {
		await container.exec(["sh", "-c", cmd]);
	}
	await container.exec(["chown", "-R", `${username}:${username}`, home]);

	return {
		container,
		connection: { host, port, username, password },
	};
}
