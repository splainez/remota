import "@testing-library/jest-dom/vitest";
import type {
	Connection,
	NewConnection,
	ConnectionUpdate,
	Settings,
	SettingsUpdate,
	ElectronAPI,
	TerminalAppId,
} from "@shared/types";
import { vi } from "vitest";

function makeConnection(overrides: Partial<Connection> = {}): Connection {
	return {
		id: 1,
		name: "Test Server",
		protocol: "sftp",
		host: "example.com",
		port: 22,
		username: "user",
		authType: "password",
		password: "",
		privateKeyPath: "",
		accessKey: "",
		secretKey: "",
		region: "us-east-1",
		bucket: "",
		endpoint: "",
		useHttps: true,
		groupName: "",
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
		...overrides,
	};
}

export function createMockApi(overrides?: Partial<ElectronAPI>): ElectronAPI {
	return {
		connections: {
			list: vi.fn<() => Promise<Connection[]>>().mockResolvedValue([]),
			get: vi.fn<(id: number) => Promise<Connection | null>>().mockResolvedValue(null),
			create: vi
				.fn<(data: NewConnection) => Promise<Connection>>()
				.mockImplementation((data) => Promise.resolve(makeConnection(data as Partial<Connection>))),
			update: vi
				.fn<(data: ConnectionUpdate) => Promise<Connection | null>>()
				.mockImplementation((data) => Promise.resolve(makeConnection(data as Partial<Connection>))),
			delete: vi.fn<(id: number) => Promise<boolean>>().mockResolvedValue(true),
			...overrides?.connections,
		},
		filesystem: {
			list: vi.fn().mockResolvedValue([]),
			listDrives: vi.fn().mockResolvedValue(["/"]),
			homeDir: vi.fn().mockResolvedValue("/home/user"),
			pathExists: vi.fn().mockResolvedValue(true),
			getLastPath: vi.fn().mockResolvedValue(null),
			setLastPath: vi.fn().mockResolvedValue(undefined),
			getIcon: vi.fn<() => Promise<string | null>>().mockResolvedValue(null),
			openPath: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
			rename: vi.fn<(oldPath: string, newName: string) => Promise<void>>().mockResolvedValue(undefined),
			remoteConnect: vi.fn().mockResolvedValue("/"),
			remoteDisconnect: vi.fn().mockResolvedValue(undefined),
			remoteList: vi.fn().mockResolvedValue([]),
			remoteHomeDir: vi.fn().mockResolvedValue("/"),
			remoteRename: vi
				.fn<(connectionId: number, oldPath: string, newName: string) => Promise<void>>()
				.mockResolvedValue(undefined),
			delete: vi.fn<(path: string) => Promise<void>>().mockResolvedValue(undefined),
			remoteDelete: vi.fn<(connectionId: number, path: string) => Promise<void>>().mockResolvedValue(undefined),
			tempGetPath: vi.fn().mockResolvedValue(undefined),
			tempWrite: vi.fn().mockResolvedValue(undefined),
			tempRead: vi.fn().mockResolvedValue([]),
			tempMkdir: vi.fn().mockResolvedValue(undefined),
			tempDelete: vi.fn().mockResolvedValue(undefined),
			tempExists: vi.fn().mockResolvedValue(false),
			download: vi.fn().mockResolvedValue({ jobId: "mock-job-id" }),
			getLocalStat: vi.fn().mockResolvedValue({ exists: false, size: 0, modified: "", isDirectory: false }),
			onTransferProgress: vi.fn().mockReturnValue(vi.fn()),
			onTransferJobDone: vi.fn().mockReturnValue(vi.fn()),
			cancelTransfer: vi.fn().mockResolvedValue(undefined),
			cancelAllTransfers: vi.fn().mockResolvedValue(undefined),
			cancelTransfersForConnection: vi.fn().mockResolvedValue(undefined),
			startWatch: vi.fn().mockResolvedValue(undefined),
			stopWatch: vi.fn().mockResolvedValue(undefined),
			onFileChanged: vi.fn().mockReturnValue(vi.fn()),
			...overrides?.filesystem,
		},
		terminal: {
			spawn: vi.fn().mockResolvedValue(undefined),
			write: vi.fn().mockResolvedValue(undefined),
			resize: vi.fn().mockResolvedValue(undefined),
			kill: vi.fn().mockResolvedValue(undefined),
			openExternal: vi.fn().mockResolvedValue(undefined),
			detectInstalled: vi.fn<() => Promise<TerminalAppId[]>>().mockResolvedValue([]),
			onData: vi.fn().mockReturnValue(vi.fn()),
			onExit: vi.fn().mockReturnValue(vi.fn()),
			...overrides?.terminal,
		},
		settings: {
			getAll: vi.fn<() => Promise<Settings>>().mockResolvedValue({
				theme: "system",
				locale: "en",
				maxParallelTransfers: 5,
				retentionMs: undefined,
			}),
			set: vi.fn<(partial: SettingsUpdate) => Promise<Settings>>().mockResolvedValue({
				theme: "system",
				locale: "en",
				maxParallelTransfers: 5,
				retentionMs: undefined,
			}),
			...overrides?.settings,
		},
		transferPanel: {
			getAll: vi.fn<() => Promise<Record<number, { visible: boolean }>>>().mockResolvedValue({}),
			set: vi.fn<(connectionId: number, update: { visible: boolean }) => Promise<void>>().mockResolvedValue(undefined),
			...overrides?.transferPanel,
		},
		filePaneSize: {
			getAll: vi.fn<() => Promise<Record<number, { localSize: number }>>>().mockResolvedValue({}),
			set: vi.fn<(connectionId: number, update: { localSize: number }) => Promise<void>>().mockResolvedValue(undefined),
			...overrides?.filePaneSize,
		},
		app: {
			getConfigPath: vi.fn<() => Promise<string>>().mockResolvedValue("/tmp/app-config.json"),
			getConfigError: vi.fn<() => Promise<null>>().mockResolvedValue(null),
			onConfigError: vi.fn().mockReturnValue(vi.fn()),
			...overrides?.app,
		},
		platform: overrides?.platform ?? "linux",
	};
}

const mockApi: ElectronAPI = createMockApi();

vi.stubGlobal("api", mockApi);

if (typeof window !== "undefined") {
	class ResizeObserverMock {
		observe() {
			/* noop */
		}
		unobserve() {
			/* noop */
		}
		disconnect() {
			/* noop */
		}
	}
	(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverMock;

	// xterm.js requires window.matchMedia with addListener; jsdom's stub lacks it
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		writable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: () => undefined,
			removeListener: () => undefined,
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
			dispatchEvent: () => false,
		}),
	});
}

export { mockApi, makeConnection };
