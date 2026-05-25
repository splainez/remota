export interface Connection {
  id: number;
  name: string;
  protocol: string;
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
    remoteConnect: (connectionId: number) => Promise<string>;
    remoteDisconnect: (connectionId: number) => Promise<void>;
    remoteList: (connectionId: number, path: string) => Promise<FileEntry[]>;
    remoteHomeDir: (connectionId: number) => Promise<string>;
  };
  platform: string;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
