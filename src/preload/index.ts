import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "../shared/ipc-channels";
import type { Connection, NewConnection, ConnectionUpdate } from "../shared/types";

const api = {
  connections: {
    list: (): Promise<Connection[]> => ipcRenderer.invoke(IPC.CONNECTION_LIST),
    get: (id: number): Promise<Connection | null> => ipcRenderer.invoke(IPC.CONNECTION_GET, id),
    create: (data: NewConnection): Promise<Connection> => ipcRenderer.invoke(IPC.CONNECTION_CREATE, data),
    update: (data: ConnectionUpdate): Promise<Connection | null> => ipcRenderer.invoke(IPC.CONNECTION_UPDATE, data),
    delete: (id: number): Promise<boolean> => ipcRenderer.invoke(IPC.CONNECTION_DELETE, id),
  },
};

contextBridge.exposeInMainWorld("api", api);
