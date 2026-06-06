import type { AppStore } from "@main/app-store";
import type { S3ConnectionManager } from "@main/s3/s3-client";
import type { SftpConnectionManager } from "@main/sftp/sftp-client";
import { IPC } from "@shared/ipc-channels";
import { ipcMain } from "electron";

export function registerRemoteFilesystemHandlers(
	sftp: SftpConnectionManager,
	s3: S3ConnectionManager,
	store: AppStore,
) {
	ipcMain.handle(IPC.REMOTE_CONNECT, async (_event, connectionId: number) => {
		const conn = store.get(connectionId);

		if (!conn) {
			throw new Error(`Connection with id ${String(connectionId)} not found`);
		}

		if (conn.protocol === "s3") {
			return s3.connect(connectionId, {
				accessKey: conn.accessKey,
				secretKey: conn.secretKey,
				region: conn.region,
				bucket: conn.bucket,
				host: conn.host,
				port: conn.port,
				endpoint: conn.endpoint || undefined,
				useHttps: conn.useHttps,
			});
		}

		const validAuthType = conn.authType;

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

	ipcMain.handle(IPC.REMOTE_DELETE, async (_event, connectionId: number, remotePath: string) => {
		if (sftp.isConnected(connectionId)) {
			await sftp.deletePath(connectionId, remotePath);
			return;
		}
		if (s3.isConnected(connectionId)) {
			await s3.deletePath(connectionId, remotePath);
			return;
		}
		throw new Error("Not connected to remote server");
	});
}
