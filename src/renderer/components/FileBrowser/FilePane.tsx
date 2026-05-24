import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../../../i18n";
import { usePlatformStore } from "../../store/platform";
import { join, parentPath } from "../../shared/path-utils";
import { useFileList } from "../../hooks/useFileList";
import { Breadcrumb } from "./Breadcrumb";
import { FileList } from "./FileList";
import { Toolbar } from "./Toolbar";

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
      void window.api.filesystem.listDrives().then(setDrives);
    }
  }, [isMocked, type, isWindows]);

  useEffect(() => {
    if (pathInitialized.current) {
      void window.api.filesystem.setLastPath(connectionId, type, currentPath);
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
    void refresh();
  }, [refresh]);

  const driveRoot = isWindows
    ? drives.find((d) => d === currentPath) ?? null
    : null;
  const showDriveSelector = isWindows && !isMocked && type === "local" && drives.length > 1;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-100 border border-gray-300 rounded-md min-w-0">
      {isMocked && (
        <div className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold text-center shrink-0">
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
        <div className="h-[22px] flex items-center px-2 bg-gray-200 border-t border-gray-300 text-xs text-gray-500 shrink-0">
          {loading ? t("file.loading") : `${String(entries.length)} ${t("file.items")}`}
        </div>
      )}
    </div>
  );
}

