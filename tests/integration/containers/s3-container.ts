import { GenericContainer, Wait, type StartedTestContainer } from "testcontainers";
import type { S3ConnectionInfo } from "./types";
import { buildS3FixtureCommands } from "./fixtures";

export interface StartedS3Container {
	container: StartedTestContainer;
	connection: S3ConnectionInfo;
}

export async function startS3Container(
	config?: Partial<S3ConnectionInfo>,
): Promise<StartedS3Container> {
	const accessKey = config?.accessKey ?? process.env.TEST_S3_ACCESS_KEY ?? "minioadmin";
	const secretKey = config?.secretKey ?? process.env.TEST_S3_SECRET_KEY ?? "minioadmin";
	const bucket = config?.bucket ?? process.env.TEST_S3_BUCKET ?? "test-bucket";
	const region = config?.region ?? process.env.TEST_S3_REGION ?? "us-east-1";

	const container = await new GenericContainer("minio/minio")
		.withExposedPorts(9000, 9001)
		.withEnvironment({
			MINIO_ROOT_USER: accessKey,
			MINIO_ROOT_PASSWORD: secretKey,
		})
		.withCommand(["server", "/data", "--console-address", ":9001"])
		.withWaitStrategy(Wait.forHttp("/minio/health/live", 9000))
		.start();

	const host = container.getHost();
	const port = container.getMappedPort(9000);
	const endpoint = config?.endpoint ?? `http://${host}:${String(port)}`;

	await container.exec([
		"mc", "alias", "set", "local", "http://localhost:9000",
		accessKey, secretKey,
	]);
	await container.exec(["mc", "mb", `local/${bucket}`]);

	const tmpDir = "/tmp/s3fixtures";
	for (const cmd of buildS3FixtureCommands(tmpDir)) {
		await container.exec(["sh", "-c", cmd]);
	}
	await container.exec(["mc", "cp", "--recursive", `${tmpDir}/`, `local/${bucket}/`]);

	return {
		container,
		connection: { endpoint, accessKey, secretKey, bucket, region },
	};
}
