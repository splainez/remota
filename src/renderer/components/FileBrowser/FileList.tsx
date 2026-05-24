import { useMemo, useState } from "react";
import { t } from "../../../i18n";
import type { FileEntry } from "../../../shared/types";
import styles from "./FileList.module.css";

type SortKey = "name" | "size" | "modified";
type SortDir = "asc" | "desc";

interface FileListProps {
  entries: FileEntry[];
  loading: boolean;
  error: string | null;
  onEnterDirectory: (name: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return i === 0 ? `${size} ${units[i]}` : `${size.toFixed(1)} ${units[i]}`;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function FileList({ entries, loading, error, onEnterDirectory }: FileListProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    const dirs = entries.filter((e) => e.isDirectory);
    const files = entries.filter((e) => !e.isDirectory);

    const cmp = (a: FileEntry, b: FileEntry): number => {
      let val: number;
      switch (sortKey) {
        case "name":
          val = a.name.localeCompare(b.name);
          break;
        case "size":
          val = a.size - b.size;
          break;
        case "modified":
          val = a.modified.localeCompare(b.modified);
          break;
      }
      return sortDir === "asc" ? val : -val;
    };

    return [...dirs.sort(cmp), ...files.sort(cmp)];
  }, [entries, sortKey, sortDir]);

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " \u25B2" : " \u25BC";
  };

  if (loading) {
    return <div className={styles.empty}>{t("file.loading")}</div>;
  }

  if (error) {
    return <div className={styles.empty}>{error}</div>;
  }

  if (sorted.length === 0) {
    return <div className={styles.empty}>{t("file.empty")}</div>;
  }

  return (
    <div className={styles.list}>
      <div className={styles.header}>
        <button className={styles.headerCell} onClick={() => handleSort("name")}>
          {t("file.name")}{sortIndicator("name")}
        </button>
        <button className={styles.headerCellSize} onClick={() => handleSort("size")}>
          {t("file.size")}{sortIndicator("size")}
        </button>
        <button className={styles.headerCellDate} onClick={() => handleSort("modified")}>
          {t("file.modified")}{sortIndicator("modified")}
        </button>
      </div>
      <div className={styles.body}>
        {sorted.map((entry) => (
          <div
            key={entry.name}
            className={styles.row}
            onDoubleClick={() => entry.isDirectory && onEnterDirectory(entry.name)}
          >
            <div className={styles.cellName}>
              <span className={entry.isDirectory ? styles.iconFolder : styles.iconFile}>
                {entry.isDirectory ? "\uD83D\uDCC1" : "\uD83D\uDCC4"}
              </span>
              <span className={styles.name}>{entry.name}</span>
            </div>
            <div className={styles.cellSize}>
              {entry.isDirectory ? "" : formatSize(entry.size)}
            </div>
            <div className={styles.cellDate}>{formatDate(entry.modified)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
