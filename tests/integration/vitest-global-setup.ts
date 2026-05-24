import { writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { startAllContainers, stopAllContainers } from "./containers/index";

const STATE_FILE = resolve("tests/integration/.containers-state.json");

export async function setup(): Promise<void> {
	if (process.env.TEST_USE_EXTERNAL === "true") {
		console.log("[integration] Using external services (TEST_USE_EXTERNAL=true)");
		return;
	}

	console.log("[integration] Starting test containers...");
	const containers = await startAllContainers();

	writeFileSync(STATE_FILE, JSON.stringify(containers, null, 2));

	console.log("[integration] Containers ready:");
	console.log(`  SFTP: ${containers.sftp.host}:${String(containers.sftp.port)} (${containers.sftp.username})`);
	console.log(`  FTP:  ${containers.ftp.host}:${String(containers.ftp.port)} (${containers.ftp.username})`);
	console.log(`  S3:   ${containers.s3.endpoint} (bucket: ${containers.s3.bucket})`);
}

export async function teardown(): Promise<void> {
	try {
		unlinkSync(STATE_FILE);
	} catch {
		/* file may not exist */
	}

	if (process.env.TEST_USE_EXTERNAL === "true") return;

	console.log("[integration] Stopping test containers...");
	await stopAllContainers();
	console.log("[integration] Containers stopped.");
}
