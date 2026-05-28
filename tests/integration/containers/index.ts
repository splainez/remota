import type { ConnectionInfo, S3ConnectionInfo, StartedContainerSet } from "./types";
import { startSftpContainer } from "./sftp-container";
import { startFtpContainer } from "./ftp-container";
import { startS3Container } from "./s3-container";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { StartedTestContainer } from "testcontainers";

const STATE_FILE = resolve("tests/integration/.containers-state.json");

let activeContainers: {
	sftp?: StartedTestContainer;
	ftp?: StartedTestContainer;
	s3?: StartedTestContainer;
} = {};

export { startSftpContainer } from "./sftp-container";
export { startFtpContainer } from "./ftp-container";
export { startS3Container } from "./s3-container";
export { startSftpContainer as startScpContainer };

export type { StartedSftpContainer } from "./sftp-container";
export type { StartedFtpContainer } from "./ftp-container";
export type { StartedS3Container } from "./s3-container";

export type * from "./types";
export * from "./fixtures";

export async function startAllContainers(): Promise<StartedContainerSet> {
	const [sftp, ftp, s3] = await Promise.all([startSftpContainer(), startFtpContainer(), startS3Container()]);

	activeContainers = {
		sftp: sftp.container,
		ftp: ftp.container,
		s3: s3.container,
	};

	const result: StartedContainerSet = {
		sftp: sftp.connection,
		ftp: ftp.connection,
		scp: sftp.connection,
		s3: s3.connection,
	};

	return result;
}

export async function stopAllContainers(): Promise<void> {
	await Promise.allSettled([activeContainers.sftp?.stop(), activeContainers.ftp?.stop(), activeContainers.s3?.stop()]);
	activeContainers = {};
}

function readState(): StartedContainerSet | null {
	try {
		return JSON.parse(readFileSync(STATE_FILE, "utf-8")) as StartedContainerSet;
	} catch {
		return null;
	}
}

export function getSftpConnection(): ConnectionInfo {
	if (process.env.TEST_USE_EXTERNAL === "true") {
		return {
			host: process.env.TEST_SFTP_HOST ?? "localhost",
			port: Number.parseInt(process.env.TEST_SFTP_PORT ?? "2222", 10),
			username: process.env.TEST_SFTP_USER ?? "testuser",
			password: process.env.TEST_SFTP_PASS ?? "testpass",
		};
	}
	const state = readState();
	if (!state?.sftp) throw new Error("SFTP container not started. Call startAllContainers() first.");
	return state.sftp;
}

export function getFtpConnection(): ConnectionInfo {
	if (process.env.TEST_USE_EXTERNAL === "true") {
		return {
			host: process.env.TEST_FTP_HOST ?? "localhost",
			port: Number.parseInt(process.env.TEST_FTP_PORT ?? "21", 10),
			username: process.env.TEST_FTP_USER ?? "testuser",
			password: process.env.TEST_FTP_PASS ?? "testpass",
		};
	}
	const state = readState();
	if (!state?.ftp) throw new Error("FTP container not started. Call startAllContainers() first.");
	return state.ftp;
}

export function getScpConnection(): ConnectionInfo {
	return getSftpConnection();
}

export function getS3Connection(): S3ConnectionInfo {
	if (process.env.TEST_USE_EXTERNAL === "true") {
		return {
			endpoint: process.env.TEST_S3_ENDPOINT ?? "http://localhost:9000",
			accessKey: process.env.TEST_S3_ACCESS_KEY ?? "minioadmin",
			secretKey: process.env.TEST_S3_SECRET_KEY ?? "minioadmin",
			bucket: process.env.TEST_S3_BUCKET ?? "test-bucket",
			region: process.env.TEST_S3_REGION ?? "us-east-1",
		};
	}
	const state = readState();
	if (!state?.s3) throw new Error("S3 container not started. Call startAllContainers() first.");
	return state.s3;
}
