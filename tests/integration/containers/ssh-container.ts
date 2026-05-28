import { GenericContainer, Wait, type StartedTestContainer } from "testcontainers";
import type { ConnectionInfo } from "./types";
import { buildFileTreeCommands } from "./fixtures";

export interface StartedSshContainer {
	container: StartedTestContainer;
	connection: ConnectionInfo;
}

export async function startSshContainer(config?: Partial<ConnectionInfo>): Promise<StartedSshContainer> {
	const username = config?.username ?? process.env.TEST_Ssh_USER ?? "testuser";
	const password = config?.password ?? process.env.TEST_Ssh_PASS ?? "testpass";

	const container = await (
		await GenericContainer.fromDockerfile(".", "Dockerfile.ssh").build()
	)
		.withExposedPorts(22)
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
