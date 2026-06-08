import type { Settings, SettingsUpdate } from "./app-config-schema";
import type { RemoteDoubleClickAction, TerminalAppId } from "./app-config-schema";
import type {
	DownloadRequest,
	DownloadResult,
	LocalStat,
	RemoteStat,
	TransferProgressEvent,
	UploadRequest,
	UploadResult,
} from "./transfer-types";

export type { Settings, SettingsUpdate, RemoteDoubleClickAction, TerminalAppId };
export type {
	DownloadRequest,
	DownloadItem,
	DownloadResult,
	DownloadItemResult,
	DownloadJobResult,
	LocalStat,
	RemoteStat,
	TransferDirection,
	TransferItemStatus,
	TransferProgressEvent,
	UploadRequest,
	UploadItem,
	UploadResult,
	UploadItemResult,
	UploadJobResult,
} from "./transfer-types";

export interface Connection {
	id: number;
	name: string;
	protocol: "sftp" | "scp" | "s3";
	host: string;
	port: number;
	username: string;
	authType: "password" | "key" | "agent";
	password: string;
	privateKeyPath: string;
	accessKey: string;
	secretKey: string;
	region: string;
	bucket: string;
	endpoint: string;
	useHttps: boolean;
	groupName: string;
	createdAt: string;
	updatedAt: string;
}

export type NewConnection = Omit<Connection, "id" | "createdAt" | "updatedAt">;

export type ConnectionUpdate = Partial<NewConnection> & { id: number };

export interface FileEntry {
	name: string;
	fullPath: string;
	isDirectory: boolean;
	size: number;
	modified: string;
}

export interface ElectronAPI {
	connections: {
		list: () => Promise<Connection[]>;
		get: (id: number) => Promise<Connection | null>;
		create: (data: NewConnection) => Promise<Connection>;
		update: (data: ConnectionUpdate) => Promise<Connection | null>;
		delete: (id: number) => Promise<boolean>;
	};
	filesystem: {
		list: (path: string) => Promise<FileEntry[]>;
		listDrives: () => Promise<string[]>;
		homeDir: () => Promise<string>;
		pathExists: (path: string) => Promise<boolean>;
		getLastPath: (connectionId: number, pane: "local" | "remote") => Promise<string | null>;
		setLastPath: (connectionId: number, pane: "local" | "remote", path: string) => Promise<void>;
		getIcon: (path: string) => Promise<string | null>;
		openPath: (path: string) => Promise<void>;
		rename: (oldPath: string, newName: string) => Promise<void>;
		remoteConnect: (connectionId: number) => Promise<string>;
		remoteDisconnect: (connectionId: number) => Promise<void>;
		remoteIsConnected: (connectionId: number) => Promise<boolean>;
		remoteList: (connectionId: number, path: string) => Promise<FileEntry[]>;
		remoteHomeDir: (connectionId: number) => Promise<string>;
		remoteRename: (connectionId: number, oldPath: string, newName: string) => Promise<void>;
		delete: (path: string) => Promise<void>;
		remoteDelete: (connectionId: number, path: string) => Promise<void>;
		startWatch: (watcherId: string, dirPath: string) => Promise<void>;
		stopWatch: (watcherId: string) => Promise<void>;
		onFileChanged: (callback: (watcherId: string) => void) => () => void;
		tempGetPath: (connectionId: number) => Promise<string | undefined>;
		tempWrite: (connectionId: number, remotePath: string, content: number[]) => Promise<void>;
		tempRead: (connectionId: number, remotePath: string) => Promise<number[]>;
		tempMkdir: (connectionId: number, remotePath: string) => Promise<void>;
		tempDelete: (connectionId: number, remotePath: string) => Promise<void>;
		tempExists: (connectionId: number, remotePath: string) => Promise<boolean>;
		download: (request: DownloadRequest) => Promise<DownloadResult>;
		upload: (request: UploadRequest) => Promise<UploadResult>;
		getLocalStat: (path: string) => Promise<LocalStat | null>;
		getRemoteStat: (connectionId: number, path: string) => Promise<RemoteStat | null>;
		onTransferProgress: (callback: (event: TransferProgressEvent) => void) => () => void;
		onTransferJobDone: (
			callback: (result: {
				jobId: string;
				results: Record<string, { id: string; status: "ok" | "error" | "cancelled"; error?: string }>;
			}) => void,
		) => () => void;
		cancelTransfer: (jobId: string, itemId: string) => Promise<void>;
		cancelAllTransfers: () => Promise<void>;
		cancelTransfersForConnection: (connectionId: number) => Promise<void>;
	};
	terminal: {
		spawn: (sessionId: string, type: "local" | "remote", connectionId?: number) => Promise<void>;
		write: (sessionId: string, data: string) => Promise<void>;
		resize: (sessionId: string, cols: number, rows: number) => Promise<void>;
		kill: (sessionId: string) => Promise<void>;
		openExternal: (connectionId: number, path: string | undefined, type: "local" | "remote") => Promise<void>;
		detectInstalled: () => Promise<TerminalAppId[]>;
		onData: (sessionId: string, callback: (data: string) => void) => () => void;
		onExit: (sessionId: string, callback: (code: number | null) => void) => () => void;
	};
	settings: {
		getAll: () => Promise<Settings>;
		set: (partial: SettingsUpdate) => Promise<Settings>;
	};
	transferPanel: {
		getAll: () => Promise<Record<number, { visible: boolean }>>;
		set: (connectionId: number, update: { visible: boolean }) => Promise<void>;
	};
	filePaneSize: {
		getAll: () => Promise<Record<number, { localSize: number }>>;
		set: (connectionId: number, update: { localSize: number }) => Promise<void>;
	};
	app: {
		getConfigPath: () => Promise<string>;
		getConfigError: () => Promise<{ message: string; filePath: string; issues: string[] } | null>;
		onConfigError: (callback: (data: { message: string; filePath: string; issues: string[] }) => void) => () => void;
		onAppConfirmQuit: (callback: () => void) => () => void;
		quitResponse: (proceed: boolean) => void;
	};
	remoteEdit: {
		start: (connectionId: number, remotePath: string) => Promise<{ tempPath: string }>;
		open: (connectionId: number, remotePath: string) => Promise<{ tempPath: string }>;
		stop: (connectionId: number, remotePath: string) => Promise<void>;
	};
	platform: string;
}

declare global {
	interface Window {
		api: ElectronAPI;
	}
}
