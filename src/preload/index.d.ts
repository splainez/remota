import type {
	Connection,
	NewConnection,
	ConnectionUpdate,
	FileEntry,
	TerminalAppId,
	DownloadRequest,
	DownloadResult,
	LocalStat,
	TransferProgressEvent,
} from "@shared/types";

declare global {
	interface Window {
		api: {
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
				download: (request: DownloadRequest) => Promise<DownloadResult>;
				getLocalStat: (path: string) => Promise<LocalStat | null>;
				onTransferProgress: (callback: (event: TransferProgressEvent) => void) => () => void;
				onTransferJobDone: (
					callback: (result: {
						jobId: string;
						results: Record<string, { id: string; status: "ok" | "error" | "cancelled"; error?: string }>;
					}) => void,
				) => () => void;
				cancelTransfer: (jobId: string, itemId: string) => Promise<void>;
				cancelAllTransfers: () => Promise<void>;
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
			app: {
				getConfigPath: () => Promise<string>;
				getConfigError: () => Promise<{ message: string; filePath: string; issues: string[] } | null>;
				onConfigError: (
					callback: (data: { message: string; filePath: string; issues: string[] }) => void,
				) => () => void;
			};
			platform: string;
		};
	}
}
