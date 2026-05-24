import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import type { Connection, NewConnection, ConnectionUpdate, ElectronAPI } from "../../shared/types";

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
      create: vi.fn<(data: NewConnection) => Promise<Connection>>().mockImplementation(
        (data) => Promise.resolve(makeConnection(data as Partial<Connection>))
      ),
      update: vi.fn<(data: ConnectionUpdate) => Promise<Connection | null>>().mockImplementation(
        (data) => Promise.resolve(makeConnection(data as Partial<Connection>))
      ),
      delete: vi.fn<(id: number) => Promise<boolean>>().mockResolvedValue(true),
      ...overrides?.connections,
    },
  };
}

const mockApi: ElectronAPI = createMockApi();

vi.stubGlobal("api", mockApi);

export { mockApi, makeConnection };
