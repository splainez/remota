import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "../shared/ipc-channels";
import type { Connection, NewConnection, ConnectionUpdate, FileEntry } from "../shared/types";

const api = {
  connections: {
    list: (): Promise<Connection[]> => ipcRenderer.invoke(IPC.CONNECTION_LIST),
    get: (id: number): Promise<Connection | null> => ipcRenderer.invoke(IPC.CONNECTION_GET, id),
    create: (data: NewConnection): Promise<Connection> => ipcRenderer.invoke(IPC.CONNECTION_CREATE, data),
    update: (data: ConnectionUpdate): Promise<Connection | null> => ipcRenderer.invoke(IPC.CONNECTION_UPDATE, data),
    delete: (id: number): Promise<boolean> => ipcRenderer.invoke(IPC.CONNECTION_DELETE, id),
  },
  filesystem: {
    list: (path: string): Promise<FileEntry[]> => ipcRenderer.invoke(IPC.FILE_LIST, path),
    listDrives: (): Promise<string[]> => ipcRenderer.invoke(IPC.FILE_LIST_DRIVES),
    homeDir: (): Promise<string> => ipcRenderer.invoke(IPC.FILE_HOME_DIR),
    pathExists: (path: string): Promise<boolean> => ipcRenderer.invoke(IPC.FILE_PATH_EXISTS, path),
    getLastPath: (connectionId: number, pane: "local" | "remote"): Promise<string | null> =>
      ipcRenderer.invoke(IPC.FILE_GET_LAST_PATH, connectionId, pane),
    setLastPath: (connectionId: number, pane: "local" | "remote", path: string): Promise<void> =>
      ipcRenderer.invoke(IPC.FILE_SET_LAST_PATH, connectionId, pane, path),
    getIcon: (path: string): Promise<string | null> => ipcRenderer.invoke(IPC.FILE_GET_ICON, path),
    remoteConnect: (connectionId: number): Promise<string> =>
      ipcRenderer.invoke(IPC.REMOTE_CONNECT, connectionId),
    remoteDisconnect: (connectionId: number): Promise<void> =>
      ipcRenderer.invoke(IPC.REMOTE_DISCONNECT, connectionId),
    remoteList: (connectionId: number, path: string): Promise<FileEntry[]> =>
      ipcRenderer.invoke(IPC.REMOTE_LIST, connectionId, path),
    remoteHomeDir: (connectionId: number): Promise<string> =>
      ipcRenderer.invoke(IPC.REMOTE_HOME_DIR, connectionId),
  },
  platform: process.platform,
};

contextBridge.exposeInMainWorld("api", api);
