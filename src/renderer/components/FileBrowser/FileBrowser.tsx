import { useEffect, useState } from "react";
import type { Connection } from "../../../shared/types";
import { FilePane } from "./FilePane";

interface FileBrowserProps {
  connection: Connection;
  onDisconnect: () => void;
}

export function FileBrowser({ connection, onDisconnect }: FileBrowserProps) {
  const [localPath, setLocalPath] = useState<string>("");
  const [remotePath, setRemotePath] = useState<string>("/");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const homeDir = await window.api.filesystem.homeDir();

        const savedLocal = await window.api.filesystem.getLastPath(connection.id, "local");
        const resolvedLocal = savedLocal
          ? await resolvePath(savedLocal)
          : homeDir;

        const savedRemote = await window.api.filesystem.getLastPath(connection.id, "remote");
        const resolvedRemote = savedRemote ?? "/";

        if (!cancelled) {
          setLocalPath(resolvedLocal);
          setRemotePath(resolvedRemote);
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          const homeDir = await window.api.filesystem.homeDir();
          setLocalPath(homeDir);
          setRemotePath("/");
          setReady(true);
        }
      }
    }

    void init();
    return () => { cancelled = true; };
  }, [connection.id]);

  if (!ready) {
    return <div className="flex flex-col h-full overflow-hidden" />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1 bg-gray-200 border-b border-gray-300 shrink-0 h-9">
        <span className="text-base font-semibold text-gray-900">{connection.name}</span>
        <button className="px-3 py-0.5 border border-gray-300 rounded bg-white text-gray-500 text-xs hover:bg-red-600 hover:text-white hover:border-red-600" onClick={onDisconnect}>
          Disconnect
        </button>
      </div>
      <div className="flex-1 flex gap-1 p-1 overflow-hidden min-h-0">
        <FilePane
          type="local"
          connectionId={connection.id}
          initialPath={localPath}
          isMocked={false}
        />
        <FilePane
          type="remote"
          connectionId={connection.id}
          initialPath={remotePath}
          isMocked={true}
        />
      </div>
    </div>
  );
}

async function resolvePath(path: string): Promise<string> {
  const exists = await window.api.filesystem.pathExists(path);
  if (exists) return path;
  return window.api.filesystem.homeDir();
}
