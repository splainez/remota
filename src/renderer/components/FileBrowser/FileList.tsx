import { useMemo, useState } from "react";
import { t } from "../../../i18n";
import type { FileEntry } from "../../../shared/types";
import { FileIcon } from "../icons/FileIcon";
import { FolderIcon } from "../icons/FolderIcon";
import { Icon } from "../icons/Icon";

type SortKey = "name" | "size" | "modified";
type SortDir = "asc" | "desc";

interface FileListProps {
  entries: FileEntry[];
  loading: boolean;
  error: string | null;
  onEnterDirectory: (name: string) => void;
  onSelectEntry: (name: string, ctrlKey: boolean, shiftKey: boolean, sortedNames: string[]) => void;
  selectedNames: string[];
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
  return i === 0 ? `${String(size)} ${units[i]}` : `${size.toFixed(1)} ${units[i]}`;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function FileList({ entries, loading, error, onEnterDirectory, onSelectEntry, selectedNames }: FileListProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const selectedSet = useMemo(() => new Set(selectedNames), [selectedNames]);

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
		if (sortKey !== key) return null;
		return sortDir === "asc"
			? <Icon name="triangle-up" size={10} className="ml-0.5" data-testid="sort-asc" />
			: <Icon name="triangle-down" size={10} className="ml-0.5" data-testid="sort-desc" />;
	};

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">{t("file.loading")}</div>;
  }

  if (error) {
    return <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">{error}</div>;
  }

  if (sorted.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">{t("file.empty")}</div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center h-[26px] px-2 bg-gray-200 border-b border-gray-300 shrink-0">
        <button
          className="flex-1 flex items-center px-1 text-gray-500 text-xs font-semibold whitespace-nowrap h-full hover:text-gray-900 hover:bg-gray-300 cursor-pointer"
          onClick={() => { handleSort("name"); }}
        >
          {t("file.name")}{sortIndicator("name")}
        </button>
        <button
          className="shrink-0 basis-[100px] flex items-center px-1 text-gray-500 text-xs font-semibold whitespace-nowrap h-full hover:text-gray-900 hover:bg-gray-300 cursor-pointer"
          onClick={() => { handleSort("size"); }}
        >
          {t("file.size")}{sortIndicator("size")}
        </button>
        <button
          className="shrink-0 basis-[150px] flex items-center px-1 text-gray-500 text-xs font-semibold whitespace-nowrap h-full hover:text-gray-900 hover:bg-gray-300 cursor-pointer"
          onClick={() => { handleSort("modified"); }}
        >
          {t("file.modified")}{sortIndicator("modified")}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.map((entry) => (
          <div
            key={entry.name}
            className={`flex items-center h-6 px-2 cursor-pointer hover:bg-gray-300 ${selectedSet.has(entry.name) ? "bg-blue-200" : ""}`}
            onClick={(e) => { onSelectEntry(entry.name, e.ctrlKey, e.shiftKey, sorted.map((s) => s.name)); }}
            onDoubleClick={() => { if (entry.isDirectory) onEnterDirectory(entry.name); }}
          >
            <div className="flex-1 flex items-center gap-1.5 px-1 overflow-hidden">
              {entry.isDirectory
                ? <FolderIcon path={entry.name} size={14} className="shrink-0" />
                : <FileIcon path={entry.name} size={14} className="shrink-0" />
              }
              <span className="overflow-hidden text-ellipsis whitespace-nowrap text-sm">{entry.name}</span>
            </div>
            <div className="shrink-0 basis-[100px] px-1 text-xs text-gray-500 text-right">
              {entry.isDirectory ? "" : formatSize(entry.size)}
            </div>
            <div className="shrink-0 basis-[150px] px-1 text-xs text-gray-500">{formatDate(entry.modified)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
