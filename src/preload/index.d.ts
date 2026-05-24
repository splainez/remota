import type { Connection, NewConnection, ConnectionUpdate, FileEntry } from "../shared/types";

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
      };
      platform: string;
    };
  }
}
