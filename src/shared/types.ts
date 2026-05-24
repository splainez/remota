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
