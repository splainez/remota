import { IPC } from "@shared/ipc-channels";
import type {
	Connection,
	ConnectionUpdate,
	DownloadRequest,
	DownloadResult,
	FileEntry,
	LocalStat,
	NewConnection,
	RemoteStat,
	Settings,
	SettingsUpdate,
	TerminalAppId,
	TransferProgressEvent,
	UploadRequest,
	UploadResult,
} from "@shared/types";
import { contextBridge, ipcRenderer } from "electron";

const api = {
	connections: {
		list: (): Promise<Connection[]> => ipcRenderer.invoke(IPC.CONNECTION_LIST),
		get: (id: number): Promise<Connection | null> => ipcRenderer.invoke(IPC.CONNECTION_GET, id),
		create: (data: NewConnection): Promise<Connection> => ipcRenderer.invoke(IPC.CONNECTION_CREATE, data),
		update: (data: ConnectionUpdate): Promise<Connection | null> => ipcRenderer.invoke(IPC.CONNECTION_UPDATE, data),
		delete: (id: number): Promise<boolean> => ipcRenderer.invoke(IPC.CONNECTION_DELETE, id),
		importSshConfig: (filePath?: string): Promise<{ imported: number; errors: string[] }> =>
			ipcRenderer.invoke(IPC.CONNECTION_IMPORT_SSH_CONFIG, filePath),
		importSshConfigFile: (): Promise<{ imported: number; errors: string[] }> =>
			ipcRenderer.invoke(IPC.CONNECTION_IMPORT_SSH_CONFIG_FILE),
	},
	filesystem: {
		list: (path: string): Promise<FileEntry[]> => ipcRenderer.invoke(IPC.FILE_LIST, path),
		listDrives: (): Promise<string[]> => ipcRenderer.invoke(IPC.FILE_LIST_DRIVES),
		homeDir: (): Promise<string> => ipcRenderer.invoke(IPC.FILE_HOME_DIR),
		pathExists: (path: string): Promise<boolean> => ipcRenderer.invoke(IPC.FILE_PATH_EXISTS, path),
		getLastPath: (connectionId: number, pane: "local" | "remote"): Promise<string | null> =>
			ipcRenderer.invoke(IPC.FILE_GET_LAST_PATH, connectionId, pane),
		setLastPath: (connectionId: number, pane: "local" | "remote", path: string): Promise<void> =>
			ipcRenderer.invoke(IPC.FILE_SET_LAST_PATH, connectionId, pane, path),
		getIcon: (path: string): Promise<string | null> => ipcRenderer.invoke(IPC.FILE_GET_ICON, path),
		openPath: (path: string): Promise<void> => ipcRenderer.invoke(IPC.FILE_OPEN_PATH, path),
		rename: (oldPath: string, newName: string): Promise<void> => ipcRenderer.invoke(IPC.FILE_RENAME, oldPath, newName),
		remoteConnect: (connectionId: number): Promise<string> => ipcRenderer.invoke(IPC.REMOTE_CONNECT, connectionId),
		remoteDisconnect: (connectionId: number): Promise<void> => ipcRenderer.invoke(IPC.REMOTE_DISCONNECT, connectionId),
		remoteIsConnected: (connectionId: number): Promise<boolean> =>
			ipcRenderer.invoke(IPC.REMOTE_IS_CONNECTED, connectionId),
		remoteList: (connectionId: number, path: string): Promise<FileEntry[]> =>
			ipcRenderer.invoke(IPC.REMOTE_LIST, connectionId, path),
		remoteHomeDir: (connectionId: number): Promise<string> => ipcRenderer.invoke(IPC.REMOTE_HOME_DIR, connectionId),
		remoteRename: (connectionId: number, oldPath: string, newName: string): Promise<void> =>
			ipcRenderer.invoke(IPC.REMOTE_RENAME, connectionId, oldPath, newName),
		delete: (path: string): Promise<void> => ipcRenderer.invoke(IPC.FILE_DELETE, path),
		remoteDelete: (connectionId: number, path: string): Promise<void> =>
			ipcRenderer.invoke(IPC.REMOTE_DELETE, connectionId, path),
		tempGetPath: (connectionId: number): Promise<string | undefined> =>
			ipcRenderer.invoke(IPC.FILE_TEMP_GET_PATH, connectionId),
		tempWrite: (connectionId: number, remotePath: string, content: number[]): Promise<void> =>
			ipcRenderer.invoke(IPC.FILE_TEMP_WRITE, connectionId, remotePath, content),
		tempRead: (connectionId: number, remotePath: string): Promise<number[]> =>
			ipcRenderer.invoke(IPC.FILE_TEMP_READ, connectionId, remotePath),
		tempMkdir: (connectionId: number, remotePath: string): Promise<void> =>
			ipcRenderer.invoke(IPC.FILE_TEMP_MKDIR, connectionId, remotePath),
		tempDelete: (connectionId: number, remotePath: string): Promise<void> =>
			ipcRenderer.invoke(IPC.FILE_TEMP_DELETE, connectionId, remotePath),
		tempExists: (connectionId: number, remotePath: string): Promise<boolean> =>
			ipcRenderer.invoke(IPC.FILE_TEMP_EXISTS, connectionId, remotePath),
		download: (request: DownloadRequest): Promise<DownloadResult> => ipcRenderer.invoke(IPC.FILE_DOWNLOAD, request),
		upload: (request: UploadRequest): Promise<UploadResult> => ipcRenderer.invoke(IPC.FILE_UPLOAD, request),
		getLocalStat: (path: string): Promise<LocalStat | null> => ipcRenderer.invoke(IPC.FILE_GET_LOCAL_STAT, path),
		getRemoteStat: (connectionId: number, path: string): Promise<RemoteStat | null> =>
			ipcRenderer.invoke(IPC.FILE_GET_REMOTE_STAT, connectionId, path),
		onTransferProgress: (callback: (event: TransferProgressEvent) => void) => {
			const handler = (_e: Electron.IpcRendererEvent, event: TransferProgressEvent) => {
				callback(event);
			};
			ipcRenderer.on(IPC.TRANSFER_PROGRESS, handler);
			return () => {
				ipcRenderer.removeListener(IPC.TRANSFER_PROGRESS, handler);
			};
		},
		onTransferJobDone: (
			callback: (result: {
				jobId: string;
				results: Record<string, { id: string; status: "ok" | "error" | "cancelled"; error?: string }>;
			}) => void,
		) => {
			const handler = (
				_e: Electron.IpcRendererEvent,
				result: {
					jobId: string;
					results: Record<string, { id: string; status: "ok" | "error" | "cancelled"; error?: string }>;
				},
			) => {
				callback(result);
			};
			ipcRenderer.on(IPC.TRANSFER_JOB_DONE, handler);
			return () => {
				ipcRenderer.removeListener(IPC.TRANSFER_JOB_DONE, handler);
			};
		},
		cancelTransfer: (jobId: string, itemId: string): Promise<void> =>
			ipcRenderer.invoke(IPC.TRANSFER_CANCEL, jobId, itemId),
		cancelAllTransfers: (): Promise<void> => ipcRenderer.invoke(IPC.TRANSFER_CANCEL_ALL),
		cancelTransfersForConnection: (connectionId: number): Promise<void> =>
			ipcRenderer.invoke(IPC.TRANSFER_CANCEL_BY_CONNECTION, connectionId),
		startWatch: (watcherId: string, dirPath: string): Promise<void> =>
			ipcRenderer.invoke(IPC.FILE_WATCH_START, watcherId, dirPath),
		stopWatch: (watcherId: string): Promise<void> => ipcRenderer.invoke(IPC.FILE_WATCH_STOP, watcherId),
		onFileChanged: (callback: (watcherId: string) => void) => {
			const handler = (_event: Electron.IpcRendererEvent, watcherId: string) => {
				callback(watcherId);
			};
			ipcRenderer.on("file:changed", handler);
			return () => {
				ipcRenderer.removeListener("file:changed", handler);
			};
		},
	},
	terminal: {
		spawn: (sessionId: string, type: "local" | "remote", connectionId?: number) => {
			return ipcRenderer.invoke(IPC.TERMINAL_SPAWN, sessionId, type, connectionId);
		},
		write: (sessionId: string, data: string): Promise<void> => ipcRenderer.invoke(IPC.TERMINAL_WRITE, sessionId, data),
		resize: (sessionId: string, cols: number, rows: number): Promise<void> =>
			ipcRenderer.invoke(IPC.TERMINAL_RESIZE, sessionId, cols, rows),
		kill: (sessionId: string) => {
			return ipcRenderer.invoke(IPC.TERMINAL_KILL, sessionId);
		},
		openExternal: (connectionId: number, path: string | undefined, type: "local" | "remote"): Promise<void> =>
			ipcRenderer.invoke(IPC.TERMINAL_OPEN_EXTERNAL, connectionId, path, type),
		detectInstalled: (): Promise<TerminalAppId[]> => ipcRenderer.invoke(IPC.TERMINAL_DETECT_INSTALLED),
		onData: (sessionId: string, callback: (data: string) => void) => {
			const channel = `terminal:data:${sessionId}`;
			const handler = (_event: Electron.IpcRendererEvent, data: string) => {
				callback(data);
			};
			ipcRenderer.on(channel, handler);
			return () => {
				ipcRenderer.removeListener(channel, handler);
			};
		},
		onExit: (sessionId: string, callback: (code: number | null) => void) => {
			const channel = `terminal:exit:${sessionId}`;
			const handler = (_event: Electron.IpcRendererEvent, code: number | null) => {
				callback(code);
			};
			ipcRenderer.on(channel, handler);
			return () => {
				ipcRenderer.removeListener(channel, handler);
			};
		},
	},
	settings: {
		getAll: (): Promise<Settings> => ipcRenderer.invoke(IPC.SETTINGS_GET_ALL),
		set: (partial: SettingsUpdate): Promise<Settings> => ipcRenderer.invoke(IPC.SETTINGS_SET, partial),
	},
	transferPanel: {
		getAll: (): Promise<Record<number, { visible: boolean }>> => ipcRenderer.invoke(IPC.TRANSFER_PANEL_GET_ALL),
		set: (connectionId: number, update: { visible: boolean }): Promise<void> =>
			ipcRenderer.invoke(IPC.TRANSFER_PANEL_SET, connectionId, update),
	},
	filePaneSize: {
		getAll: (): Promise<Record<number, { localSize: number }>> => ipcRenderer.invoke(IPC.FILE_PANE_SIZE_GET_ALL),
		set: (connectionId: number, update: { localSize: number }): Promise<void> =>
			ipcRenderer.invoke(IPC.FILE_PANE_SIZE_SET, connectionId, update),
	},
	app: {
		getConfigPath: (): Promise<string> => ipcRenderer.invoke(IPC.APP_GET_CONFIG_PATH),
		getConfigError: (): Promise<{ message: string; filePath: string; issues: string[] } | null> =>
			ipcRenderer.invoke(IPC.APP_GET_CONFIG_ERROR),
		onConfigError: (callback: (data: { message: string; filePath: string; issues: string[] }) => void) => {
			const handler = (
				_event: Electron.IpcRendererEvent,
				data: { message: string; filePath: string; issues: string[] },
			) => {
				callback(data);
			};
			ipcRenderer.on("config-error", handler);
			return () => {
				ipcRenderer.removeListener("config-error", handler);
			};
		},
		onAppConfirmQuit: (callback: () => void) => {
			const handler = () => {
				callback();
			};
			ipcRenderer.on(IPC.APP_CONFIRM_QUIT, handler);
			return () => {
				ipcRenderer.removeListener(IPC.APP_CONFIRM_QUIT, handler);
			};
		},
		quitResponse: (proceed: boolean): void => {
			ipcRenderer.send(IPC.APP_QUIT_RESPONSE, proceed);
		},
	},
	remoteEdit: {
		start: (connectionId: number, remotePath: string): Promise<{ tempPath: string }> =>
			ipcRenderer.invoke(IPC.REMOTE_EDIT_START, connectionId, remotePath),
		open: (connectionId: number, remotePath: string): Promise<{ tempPath: string }> =>
			ipcRenderer.invoke(IPC.REMOTE_FILE_OPEN, connectionId, remotePath),
		stop: (connectionId: number, remotePath: string): Promise<void> =>
			ipcRenderer.invoke(IPC.REMOTE_EDIT_STOP, connectionId, remotePath),
	},
	platform: process.platform,
};

contextBridge.exposeInMainWorld("api", api);
