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
  createdAt: string;
  updatedAt: string;
}

export type NewConnection = Omit<Connection, "id" | "createdAt" | "updatedAt">;

export type ConnectionUpdate = Partial<NewConnection> & { id: number };

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
