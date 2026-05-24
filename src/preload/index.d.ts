import type { Connection, NewConnection, ConnectionUpdate } from "../shared/types";

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
    };
  }
}
