import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import type {
	Connection,
	NewConnection,
	ConnectionUpdate,
	Settings,
	SettingsUpdate,
	ElectronAPI,
} from "../../shared/types";

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
			remoteConnect: vi.fn().mockResolvedValue("/"),
			remoteDisconnect: vi.fn().mockResolvedValue(undefined),
			remoteList: vi.fn().mockResolvedValue([]),
			remoteHomeDir: vi.fn().mockResolvedValue("/"),
			...overrides?.filesystem,
		},
		terminal: {
			spawn: vi.fn().mockResolvedValue(undefined),
			write: vi.fn().mockResolvedValue(undefined),
			resize: vi.fn().mockResolvedValue(undefined),
			kill: vi.fn().mockResolvedValue(undefined),
			onData: vi.fn().mockReturnValue(vi.fn()),
			onExit: vi.fn().mockReturnValue(vi.fn()),
			...overrides?.terminal,
		},
		settings: {
			getAll: vi.fn<() => Promise<Settings>>().mockResolvedValue({ theme: "system", locale: "en" }),
			set: vi.fn<(partial: SettingsUpdate) => Promise<Settings>>().mockResolvedValue({
				theme: "system",
				locale: "en",
			}),
			...overrides?.settings,
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

export { mockApi, makeConnection };
