import { useEffect, useState } from "react";
import type { Connection } from "../../../shared/types";
import { FilePane } from "./FilePane";
import styles from "./FileBrowser.module.css";

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
    return <div className={styles.container} />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.connectionLabel}>{connection.name}</span>
        <button className={styles.disconnectBtn} onClick={onDisconnect}>
          Disconnect
        </button>
      </div>
      <div className={styles.panes}>
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
