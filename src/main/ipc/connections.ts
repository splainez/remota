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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function registerConnectionHandlers(db: DatabaseInstance) {
  ipcMain.handle(IPC.CONNECTION_LIST, async () => {
    const rows = db.select().from(connections).all();
    return rows.map(rowToConnection);
  });

  ipcMain.handle(IPC.CONNECTION_GET, async (_event, id: number) => {
    const row = db.select().from(connections).where(eq(connections.id, id)).get();
    return row ? rowToConnection(row) : null;
  });

  ipcMain.handle(IPC.CONNECTION_CREATE, async (_event, data: NewConnection) => {
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
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    return rowToConnection(result);
  });

  ipcMain.handle(IPC.CONNECTION_UPDATE, async (_event, data: ConnectionUpdate) => {
    const now = new Date().toISOString();
    const result = db
      .update(connections)
      .set({ ...data, updatedAt: now } as any)
      .where(eq(connections.id, data.id))
      .returning()
      .get();
    return result ? rowToConnection(result) : null;
  });

  ipcMain.handle(IPC.CONNECTION_DELETE, async (_event, id: number) => {
    const row = db.select().from(connections).where(eq(connections.id, id)).get();
    if (!row) return false;
    db.delete(connections).where(eq(connections.id, id)).run();
    return true;
  });
}
