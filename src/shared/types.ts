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
		remoteConnect: (connectionId: number) => Promise<string>;
		remoteDisconnect: (connectionId: number) => Promise<void>;
		remoteList: (connectionId: number, path: string) => Promise<FileEntry[]>;
		remoteHomeDir: (connectionId: number) => Promise<string>;
	};
	terminal: {
		spawn: (sessionId: string, type: "local" | "remote", connectionId?: number) => Promise<void>;
		write: (sessionId: string, data: string) => Promise<void>;
		resize: (sessionId: string, cols: number, rows: number) => Promise<void>;
		kill: (sessionId: string) => Promise<void>;
		onData: (sessionId: string, callback: (data: string) => void) => () => void;
		onExit: (sessionId: string, callback: (code: number | null) => void) => () => void;
	};
	app: {
		getConfigPath: () => Promise<string>;
		getConfigError: () => Promise<{ message: string; filePath: string; issues: string[] } | null>;
		onConfigError: (callback: (data: { message: string; filePath: string; issues: string[] }) => void) => () => void;
	};
	platform: string;
}

declare global {
	interface Window {
		api: ElectronAPI;
	}
}
