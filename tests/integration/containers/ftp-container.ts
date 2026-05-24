import { GenericContainer, Wait, type StartedTestContainer } from "testcontainers";
import type { ConnectionInfo } from "./types";
import { buildFileTreeCommands } from "./fixtures";

export interface StartedFtpContainer {
	container: StartedTestContainer;
	connection: ConnectionInfo;
}

export async function startFtpContainer(
	config?: Partial<ConnectionInfo>,
): Promise<StartedFtpContainer> {
	const username = config?.username ?? process.env.TEST_FTP_USER ?? "testuser";
	const password = config?.password ?? process.env.TEST_FTP_PASS ?? "testpass";

	const container = await new GenericContainer("fauria/vsftpd")
		.withExposedPorts(21)
		.withEnvironment({
			FTP_USER: username,
			FTP_PASS: password,
			PASV_ADDRESS: "127.0.0.1",
			PASV_MIN_PORT: "21100",
			PASV_MAX_PORT: "21110",
		})
		.withWaitStrategy(Wait.forListeningPorts())
		.start();

	const host = container.getHost();
	const port = config?.port ?? container.getMappedPort(21);

	const home = `/home/vsftpd/${username}`;
	for (const cmd of buildFileTreeCommands(home)) {
		await container.exec(["sh", "-c", cmd]);
	}
	await container.exec(["chown", "-R", "ftp:ftp", home]);

	return {
		container,
		connection: { host, port, username, password },
	};
}
