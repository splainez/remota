import { useCallback } from "react";
import { t } from "../../../i18n";
import styles from "./Toolbar.module.css";

interface ToolbarProps {
  onNavigateUp: () => void;
  onRefresh: () => void;
  onNavigateTo: (path: string) => void;
  drives: string[];
  currentPath: string;
  isAtDriveRoot: boolean;
}

export function Toolbar({
  onNavigateUp,
  onRefresh,
  onNavigateTo,
  drives,
  currentPath,
  isAtDriveRoot,
}: ToolbarProps) {
  const upDisabled = isAtDriveRoot || !canGoUp(currentPath);

  const handleDriveChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      if (value && value !== currentPath) {
        onNavigateTo(value);
      }
    },
    [onNavigateTo, currentPath],
  );

  return (
    <div className={styles.toolbar}>
      <button
        className={styles.btn}
        onClick={onNavigateUp}
        disabled={upDisabled}
        title={t("file.navigateUp")}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 3L4 7H7v6h2V7h3L8 3z" />
          <path d="M3 2v2h10V2H3z" opacity="0.3" />
        </svg>
      </button>
      {drives.length > 0 && (
        <select
          className={styles.driveSelect}
          value={isAtDriveRoot ? currentPath : ""}
          onChange={handleDriveChange}
          title={t("file.selectDrive")}
        >
          <option value="" disabled>
            {t("file.selectDrive")}
          </option>
          {drives.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      )}
      <button
        className={styles.btn}
        onClick={onRefresh}
        title={t("file.refresh")}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.5 2.5A7 7 0 001.5 8h2a5 5 0 018.6-2.5L10 8h5V3l-1.5-.5z" />
        </svg>
      </button>
    </div>
  );
}

export function canGoUp(path: string): boolean {
  if (path === "/") return false;
  if (/^[a-zA-Z]:\\$/.test(path)) return false;
  return true;
}
