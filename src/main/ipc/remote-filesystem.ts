import type { AppStore } from "@main/app-store";
import { updateJumpList } from "@main/jump-list";
import type { S3ConnectionManager } from "@main/s3/s3-client";
import type { SftpConnectionManager } from "@main/sftp/sftp-client";
import { IPC } from "@shared/ipc-channels";
import { remoteDeleteParamsSchema, remoteCreateParamsSchema, remoteChmodParamsSchema, remoteChownParamsSchema } from "@shared/validation";
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

		let result: string;
		if (conn.protocol === "s3") {
			result = await s3.connect(connectionId, {
				accessKey: conn.accessKey,
				secretKey: conn.secretKey,
				region: conn.region,
				bucket: conn.bucket,
				host: conn.host,
				port: conn.port,
				endpoint: conn.endpoint || undefined,
				useHttps: conn.useHttps,
			});
		} else {
			const validAuthType = conn.authType;
			result = await sftp.connect(connectionId, {
				host: conn.host,
				port: conn.port,
				username: conn.username,
				authType: validAuthType,
				password: conn.password,
				privateKeyPath: conn.privateKeyPath || undefined,
			});
		}

		store.markRecent(connectionId);
		updateJumpList(store);
		return result;
	});

	ipcMain.handle(IPC.REMOTE_DISCONNECT, async (_event, connectionId: number) => {
		if (sftp.isConnected(connectionId)) {
			await sftp.disconnect(connectionId);
		} else if (s3.isConnected(connectionId)) {
			s3.disconnect(connectionId);
		}
	});

	ipcMain.handle(IPC.REMOTE_IS_CONNECTED, (_event, connectionId: number) => {
		return sftp.isConnected(connectionId) || s3.isConnected(connectionId);
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
		const parsed = remoteDeleteParamsSchema.safeParse({ connectionId, remotePath });
		if (!parsed.success) {
			throw new Error(`Invalid remote delete params: ${parsed.error.message}`);
		}
		if (sftp.isConnected(parsed.data.connectionId)) {
			await sftp.deletePath(parsed.data.connectionId, parsed.data.remotePath);
			return;
		}
		if (s3.isConnected(parsed.data.connectionId)) {
			await s3.deletePath(parsed.data.connectionId, parsed.data.remotePath);
			return;
		}
		throw new Error("Not connected to remote server");
	});

	ipcMain.handle(IPC.REMOTE_MKDIR, async (_event, connectionId: number, parentPath: string, name: string) => {
		const parsed = remoteCreateParamsSchema.safeParse({ connectionId, parentPath, name });
		if (!parsed.success) {
			throw new Error(`Invalid remote mkdir params: ${parsed.error.message}`);
		}
		const remotePath = `${parsed.data.parentPath}/${parsed.data.name}`;
		if (sftp.isConnected(parsed.data.connectionId)) {
			await sftp.mkdir(parsed.data.connectionId, remotePath);
			return;
		}
		if (s3.isConnected(parsed.data.connectionId)) {
			await s3.mkdir(parsed.data.connectionId, remotePath);
			return;
		}
		throw new Error("Not connected to remote server");
	});

	ipcMain.handle(IPC.REMOTE_CREATE_FILE, async (_event, connectionId: number, parentPath: string, name: string) => {
		const parsed = remoteCreateParamsSchema.safeParse({ connectionId, parentPath, name });
		if (!parsed.success) {
			throw new Error(`Invalid remote createFile params: ${parsed.error.message}`);
		}
		const remotePath = `${parsed.data.parentPath}/${parsed.data.name}`;
		if (sftp.isConnected(parsed.data.connectionId)) {
			await sftp.createFile(parsed.data.connectionId, remotePath);
			return;
		}
		if (s3.isConnected(parsed.data.connectionId)) {
			await s3.createFile(parsed.data.connectionId, remotePath);
			return;
		}
		throw new Error("Not connected to remote server");
	});

	ipcMain.handle(IPC.FILE_GET_REMOTE_STAT, async (_event, connectionId: number, remotePath: string) => {
		if (sftp.isConnected(connectionId)) {
			return sftp.getRemoteStat(connectionId, remotePath);
		}
		if (s3.isConnected(connectionId)) {
			return s3.getRemoteStat(connectionId, remotePath);
		}
		throw new Error("Not connected to remote server");
	});

	ipcMain.handle(IPC.REMOTE_CHMOD, async (_event, connectionId: number, remotePath: string, mode: string) => {
		const parsed = remoteChmodParamsSchema.safeParse({ connectionId, remotePath, mode });
		if (!parsed.success) {
			throw new Error(`Invalid remote chmod params: ${parsed.error.message}`);
		}
		if (sftp.isConnected(parsed.data.connectionId)) {
			await sftp.execRemote(parsed.data.connectionId, `chmod ${parsed.data.mode} ${JSON.stringify(parsed.data.remotePath)}`);
			return;
		}
		throw new Error("Not connected to remote server");
	});

	ipcMain.handle(IPC.REMOTE_CHOWN, async (_event, connectionId: number, remotePath: string, uid: number, gid: number) => {
		const parsed = remoteChownParamsSchema.safeParse({ connectionId, remotePath, uid, gid });
		if (!parsed.success) {
			throw new Error(`Invalid remote chown params: ${parsed.error.message}`);
		}
		if (sftp.isConnected(parsed.data.connectionId)) {
			await sftp.execRemote(
				parsed.data.connectionId,
				`chown ${String(parsed.data.uid)}:${String(parsed.data.gid)} ${JSON.stringify(parsed.data.remotePath)}`,
			);
			return;
		}
		throw new Error("Not connected to remote server");
	});

	ipcMain.handle(IPC.REMOTE_LIST_USERS, async (_event, connectionId: number) => {
		if (sftp.isConnected(connectionId)) {
			return sftp.listUsers(connectionId);
		}
		throw new Error("Not connected to remote server");
	});

	ipcMain.handle(IPC.REMOTE_LIST_GROUPS, async (_event, connectionId: number) => {
		if (sftp.isConnected(connectionId)) {
			return sftp.listGroups(connectionId);
		}
		throw new Error("Not connected to remote server");
	});
}
