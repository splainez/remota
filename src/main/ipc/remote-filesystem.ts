import { ipcMain } from "electron";
import { IPC } from "../../shared/ipc-channels";
import type { DatabaseInstance } from "../database";
import { connections as connectionsTable } from "../database/schema";
import { eq } from "drizzle-orm";
import type { SftpConnectionManager } from "../sftp/sftp-client";

export function registerRemoteFilesystemHandlers(
  sftp: SftpConnectionManager,
  db: DatabaseInstance,
) {
  ipcMain.handle(IPC.REMOTE_CONNECT, async (_event, connectionId: number) => {
    const rows = await db
      .select()
      .from(connectionsTable)
      .where(eq(connectionsTable.id, connectionId));

    if (rows.length === 0) {
      throw new Error(`Connection with id ${String(connectionId)} not found`);
    }

    const conn = rows[0];
    const authType = conn.authType;
    const validAuthType = (
      authType === "password" || authType === "key" || authType === "agent"
    ) ? authType : "password";

    return sftp.connect(connectionId, {
      host: conn.host,
      port: conn.port,
      username: conn.username,
      authType: validAuthType,
      password: conn.password,
      privateKeyPath: conn.privateKeyPath || undefined,
    });
  });

  ipcMain.handle(IPC.REMOTE_DISCONNECT, async (_event, connectionId: number) => {
    await sftp.disconnect(connectionId);
  });

  ipcMain.handle(IPC.REMOTE_LIST, async (_event, connectionId: number, path: string) => {
    return sftp.listDirectory(connectionId, path);
  });

  ipcMain.handle(IPC.REMOTE_HOME_DIR, async (_event, connectionId: number) => {
    return sftp.homeDir(connectionId);
  });
}
