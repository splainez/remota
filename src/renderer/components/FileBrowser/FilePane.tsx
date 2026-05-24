import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../../../i18n";
import { usePlatformStore } from "../../store/platform";
import { join, parentPath } from "../../shared/path-utils";
import { useFileList } from "../../hooks/useFileList";
import { Breadcrumb } from "./Breadcrumb";
import { FileList } from "./FileList";
import { Toolbar } from "./Toolbar";
import styles from "./FilePane.module.css";

interface FilePaneProps {
  type: "local" | "remote";
  connectionId: number;
  initialPath: string;
  isMocked: boolean;
}

export function FilePane({ type, connectionId, initialPath, isMocked }: FilePaneProps) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [drives, setDrives] = useState<string[]>([]);
  const pathInitialized = useRef(false);
  const isWindows = usePlatformStore((s) => s.isWindows);

  useEffect(() => {
    if (!pathInitialized.current) {
      pathInitialized.current = true;
      return;
    }
    setCurrentPath(initialPath);
  }, [initialPath]);

  useEffect(() => {
    if (!isMocked && type === "local" && isWindows) {
      window.api.filesystem.listDrives().then(setDrives);
    }
  }, [isMocked, type, isWindows]);

  useEffect(() => {
    if (pathInitialized.current) {
      window.api.filesystem.setLastPath(connectionId, type, currentPath);
    }
  }, [currentPath, connectionId, type]);

  const { entries, loading, error, refresh } = useFileList(currentPath, isMocked);

  const handleNavigate = useCallback((path: string) => {
    setCurrentPath(path);
  }, []);

  const handleNavigateUp = useCallback(() => {
    const newPath = parentPath(currentPath);
    if (newPath !== null) {
      setCurrentPath(newPath);
    }
  }, [currentPath]);

  const handleNavigateTo = useCallback((path: string) => {
    setCurrentPath(path);
  }, []);

  const handleEnterDirectory = useCallback(
    (name: string) => {
      setCurrentPath(join(currentPath, name));
    },
    [currentPath],
  );

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const driveRoot = isWindows
    ? drives.find((d) => d === currentPath) ?? null
    : null;
  const showDriveSelector = isWindows && !isMocked && type === "local" && drives.length > 1;

  return (
    <div className={styles.pane}>
      {isMocked && (
        <div className={styles.mockBanner}>
          {t("file.mockBanner")}
        </div>
      )}
      <Toolbar
        onNavigateUp={handleNavigateUp}
        onRefresh={handleRefresh}
        onNavigateTo={handleNavigateTo}
        drives={showDriveSelector ? drives : []}
        currentPath={currentPath}
        isAtDriveRoot={driveRoot !== null}
      />
      <Breadcrumb path={currentPath} onNavigate={handleNavigate} />
      <FileList
        entries={entries}
        loading={loading}
        error={error}
        onEnterDirectory={handleEnterDirectory}
      />
      {!isMocked && (
        <div className={styles.statusBar}>
          {loading ? t("file.loading") : `${entries.length} ${t("file.items")}`}
        </div>
      )}
    </div>
  );
}

