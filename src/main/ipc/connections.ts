import { ipcMain } from "electron";
import { eq } from "drizzle-orm";
import { connections } from "../database/schema";
import { IPC } from "../../shared/ipc-channels";
import type { DatabaseInstance } from "../database";
import type { Connection, NewConnection, ConnectionUpdate } from "../../shared/types";

function rowToConnection(row: typeof connections.$inferSelect): Connection {
  return {
    id: row.id,
    name: row.name,
    protocol: row.protocol,
    host: row.host,
    port: row.port,
    username: row.username,
    authType: row.authType as Connection["authType"],
    password: row.password,
    privateKeyPath: row.privateKeyPath,
    accessKey: row.accessKey,
    secretKey: row.secretKey,
    region: row.region,
    bucket: row.bucket,
    endpoint: row.endpoint,
    useHttps: row.useHttps === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function registerConnectionHandlers(db: DatabaseInstance) {
  ipcMain.handle(IPC.CONNECTION_LIST, () => {
    const rows = db.select().from(connections).all();
    return rows.map(rowToConnection);
  });

  ipcMain.handle(IPC.CONNECTION_GET, (_event, id: number) => {
    const row = db.select().from(connections).where(eq(connections.id, id)).get();
    return row ? rowToConnection(row) : null;
  });

  ipcMain.handle(IPC.CONNECTION_CREATE, (_event, data: NewConnection) => {
    const now = new Date().toISOString();
    const result = db
      .insert(connections)
      .values({
        name: data.name,
        protocol: data.protocol,
        host: data.host,
        port: data.port,
        username: data.username,
        authType: data.authType,
        password: data.password,
        privateKeyPath: data.privateKeyPath,
        accessKey: data.accessKey,
        secretKey: data.secretKey,
        region: data.region,
        bucket: data.bucket,
        endpoint: data.endpoint,
        useHttps: data.useHttps ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    return rowToConnection(result);
  });

  ipcMain.handle(IPC.CONNECTION_UPDATE, (_event, data: ConnectionUpdate) => {
    const now = new Date().toISOString();
    const setData: Record<string, unknown> = { ...data, updatedAt: now };
    if (typeof data.useHttps === "boolean") {
      setData.useHttps = data.useHttps ? 1 : 0;
    }
    const result = db
      .update(connections)
      .set(setData)
      .where(eq(connections.id, data.id))
      .returning()
      .get();
    return rowToConnection(result);
  });

  ipcMain.handle(IPC.CONNECTION_DELETE, (_event, id: number) => {
    const row = db.select().from(connections).where(eq(connections.id, id)).get();
    if (!row) return false;
    db.delete(connections).where(eq(connections.id, id)).run();
    return true;
  });
}
