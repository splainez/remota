import type { Connection, NewConnection, ConnectionUpdate } from "../shared/types";

export interface ElectronAPI {
  connections: {
    list: () => Promise<Connection[]>;
    get: (id: number) => Promise<Connection | null>;
    create: (data: NewConnection) => Promise<Connection>;
    update: (data: ConnectionUpdate) => Promise<Connection | null>;
    delete: (id: number) => Promise<boolean>;
  };
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
