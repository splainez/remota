import { randomBytes } from "node:crypto";

import { CreateBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { GenericContainer, Wait, type StartedTestContainer } from "testcontainers";

import type { S3ConnectionInfo } from "./types";

export interface StartedS3Container {
	container: StartedTestContainer;
	connection: S3ConnectionInfo;
}

const FIXTURE_FILES = [
	{ key: "readable/hello.txt", content: "Hello World" },
	{ key: "nested/sub/deep.txt", content: "deep file" },
	{ key: "binary.bin", size: 1024 },
	{ key: "large.bin", size: 1024 * 1024 },
] as const;

export async function startS3Container(config?: Partial<S3ConnectionInfo>): Promise<StartedS3Container> {
	const accessKey = config?.accessKey ?? process.env.TEST_S3_ACCESS_KEY ?? "rustfsadmin";
	const secretKey = config?.secretKey ?? process.env.TEST_S3_SECRET_KEY ?? "rustfsadmin";
	const bucket = config?.bucket ?? process.env.TEST_S3_BUCKET ?? "test-bucket";
	const region = config?.region ?? process.env.TEST_S3_REGION ?? "us-east-1";

	const container = await new GenericContainer("rustfs/rustfs:latest")
		.withExposedPorts(9000, 9001)
		.withEnvironment({
			RUSTFS_VOLUMES: "/data",
			RUSTFS_ADDRESS: "0.0.0.0:9000",
			RUSTFS_CONSOLE_ADDRESS: "0.0.0.0:9001",
			RUSTFS_CONSOLE_ENABLE: "true",
			RUSTFS_CONSOLE_CORS_ALLOWED_ORIGINS: "*",
			RUSTFS_ACCESS_KEY: accessKey,
			RUSTFS_SECRET_KEY: secretKey,
			RUSTFS_OBS_LOGGER_LEVEL: "info",
		})
		.withWaitStrategy(Wait.forListeningPorts())
		.start();

	const host = container.getHost();
	const port = container.getMappedPort(9000);
	const endpoint = config?.endpoint ?? `http://${host}:${String(port)}`;

	const s3 = new S3Client({
		region,
		endpoint,
		credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
		forcePathStyle: true,
	});

	await s3.send(new CreateBucketCommand({ Bucket: bucket }));

	for (const file of FIXTURE_FILES) {
		const body = "content" in file ? Buffer.from(file.content) : randomBytes(file.size);
		await s3.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: file.key,
				Body: body,
			}),
		);
	}

	return {
		container,
		connection: { endpoint, accessKey, secretKey, bucket, region },
	};
}
