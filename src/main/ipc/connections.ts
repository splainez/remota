import { ipcMain } from "electron";
import { eq } from "drizzle-orm";
import { connections } from "../database/schema";
import { IPC } from "../../shared/ipc-channels";
import { connectionFormSchema, connectionBaseSchema } from "../../shared/validation";
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
    groupName: row.groupName,
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
    const parsed = connectionFormSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`Invalid connection data: ${parsed.error.message}`);
    }
    const validated = parsed.data;
    const now = new Date().toISOString();
    const result = db
      .insert(connections)
      .values({
        name: validated.name,
        protocol: validated.protocol,
        host: validated.host,
        port: validated.port,
        username: validated.username,
        authType: validated.authType,
        password: validated.password,
        privateKeyPath: validated.privateKeyPath,
        accessKey: validated.accessKey,
        secretKey: validated.secretKey,
        region: validated.region,
        bucket: validated.bucket,
        endpoint: validated.endpoint,
        useHttps: validated.useHttps ? 1 : 0,
        groupName: validated.groupName,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    return rowToConnection(result);
  });

  ipcMain.handle(IPC.CONNECTION_UPDATE, (_event, data: ConnectionUpdate) => {
    const partialSchema = connectionBaseSchema.partial();
    const parsed = partialSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`Invalid connection data: ${parsed.error.message}`);
    }
    const validated = parsed.data;
    const now = new Date().toISOString();
    const setData: Record<string, unknown> = { updatedAt: now };
    if (validated.name !== undefined) setData.name = validated.name;
    if (validated.protocol !== undefined) setData.protocol = validated.protocol;
    if (validated.host !== undefined) setData.host = validated.host;
    if (validated.port !== undefined) setData.port = validated.port;
    if (validated.username !== undefined) setData.username = validated.username;
    if (validated.authType !== undefined) setData.authType = validated.authType;
    if (validated.password !== undefined) setData.password = validated.password;
    if (validated.privateKeyPath !== undefined) setData.privateKeyPath = validated.privateKeyPath;
    if (validated.accessKey !== undefined) setData.accessKey = validated.accessKey;
    if (validated.secretKey !== undefined) setData.secretKey = validated.secretKey;
    if (validated.region !== undefined) setData.region = validated.region;
    if (validated.bucket !== undefined) setData.bucket = validated.bucket;
    if (validated.endpoint !== undefined) setData.endpoint = validated.endpoint;
    if (validated.useHttps !== undefined) setData.useHttps = validated.useHttps ? 1 : 0;
    if (validated.groupName !== undefined) setData.groupName = validated.groupName;
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
