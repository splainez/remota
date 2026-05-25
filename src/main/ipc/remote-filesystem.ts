import { ipcMain } from "electron";
import { IPC } from "../../shared/ipc-channels";
import type { DatabaseInstance } from "../database";
import { connections as connectionsTable } from "../database/schema";
import { eq } from "drizzle-orm";
import type { SftpConnectionManager } from "../sftp/sftp-client";
import type { S3ConnectionManager } from "../s3/s3-client";

export function registerRemoteFilesystemHandlers(
	sftp: SftpConnectionManager,
	s3: S3ConnectionManager,
	db: DatabaseInstance,
) {
	ipcMain.handle(IPC.REMOTE_CONNECT, async (_event, connectionId: number) => {
		const rows = await db
			.select()
			.from(connectionsTable)
			.where(eq(connectionsTable.id, connectionId));

		if (rows.length === 0) {
			throw new Error(`Connection with id ${String(connectionId)} not found`);
		}

		const conn = rows[0];

		if (conn.protocol === "s3") {
			return s3.connect(connectionId, {
				accessKey: conn.accessKey,
				secretKey: conn.secretKey,
				region: conn.region,
				bucket: conn.bucket,
				host: conn.host,
				port: conn.port,
				endpoint: conn.endpoint || undefined,
				useHttps: conn.useHttps === 1,
			});
		}

		const authType = conn.authType;
		const validAuthType = (
			authType === "password" || authType === "key" || authType === "agent"
		) ? authType : "password";

		return sftp.connect(connectionId, {
			host: conn.host,
			port: conn.port,
			username: conn.username,
			authType: validAuthType,
			password: conn.password,
			privateKeyPath: conn.privateKeyPath || undefined,
		});
	});

	ipcMain.handle(IPC.REMOTE_DISCONNECT, async (_event, connectionId: number) => {
		if (sftp.isConnected(connectionId)) {
			await sftp.disconnect(connectionId);
		} else if (s3.isConnected(connectionId)) {
			s3.disconnect(connectionId);
		}
	});

	ipcMain.handle(IPC.REMOTE_LIST, async (_event, connectionId: number, path: string) => {
		if (sftp.isConnected(connectionId)) {
			return sftp.listDirectory(connectionId, path);
		}
		if (s3.isConnected(connectionId)) {
			return s3.listDirectory(connectionId, path);
		}
		throw new Error("Not connected to remote server");
	});

	ipcMain.handle(IPC.REMOTE_HOME_DIR, async (_event, connectionId: number) => {
		if (sftp.isConnected(connectionId)) {
			return sftp.homeDir(connectionId);
		}
		if (s3.isConnected(connectionId)) {
			return s3.homeDir();
		}
		throw new Error("Not connected to remote server");
	});
}
