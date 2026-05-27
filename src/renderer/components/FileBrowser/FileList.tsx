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
	errorDetail?: string;
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

export function FileList({ entries, loading, error, errorDetail, onEnterDirectory, onSelectEntry, selectedNames }: FileListProps) {
	const [sortKey, setSortKey] = useState<SortKey>("name");
	const [sortDir, setSortDir] = useState<SortDir>("asc");
	const [showDetail, setShowDetail] = useState(false);
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
		return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">{t("file.loading")}</div>;
	}

	if (error) {
		return (
			<div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-1 p-4">
				<span>{error}</span>
				{errorDetail && (
					<>
						<button
							className="text-xs text-primary hover:underline cursor-pointer mt-1"
							onClick={() => { setShowDetail((v) => !v); }}
						>
							{showDetail ? t("remote.hideDetails") : t("remote.showDetails")}
						</button>
						{showDetail && (
							<pre className="text-xs text-muted-foreground bg-surface-container p-2 rounded mt-1 max-w-full overflow-auto whitespace-pre-wrap break-all">
								{errorDetail}
							</pre>
						)}
					</>
				)}
			</div>
		);
	}

	if (sorted.length === 0) {
		return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">{t("file.empty")}</div>;
	}

	return (
		<div className="flex-1 flex flex-col overflow-hidden">
			{/* File List Header */}
			<div className="flex px-4 py-2 border-b border-outline-variant bg-surface-container-lowest font-label-md text-label-md text-on-surface-variant select-none shrink-0">
				<div className="w-8" />
				<button
					className="flex-1 cursor-pointer hover:text-on-surface flex items-center gap-1 text-left"
					onClick={() => { handleSort("name"); }}
				>
					{t("file.name")}{sortIndicator("name")}
				</button>
				<button
					className="w-24 text-right cursor-pointer hover:text-on-surface"
					onClick={() => { handleSort("size"); }}
				>
					{t("file.size")}{sortIndicator("size")}
				</button>
				<button
					className="w-32 text-right cursor-pointer hover:text-on-surface hidden xl:block"
					onClick={() => { handleSort("modified"); }}
				>
					{t("file.modified")}{sortIndicator("modified")}
				</button>
			</div>
			{/* File List Content */}
			<div className="flex-1 overflow-y-auto">
				{sorted.map((entry) => {
					const isSelected = selectedSet.has(entry.name);
					return (
						<div
							key={entry.name}
							className={[
								"flex px-4 py-2 border-b border-outline-variant/30 cursor-pointer group items-center transition-colors",
								isSelected ? "bg-primary-fixed-dim/20" : "hover:bg-surface-container-low",
							].join(" ")}
							onClick={(e) => { onSelectEntry(entry.name, e.ctrlKey, e.shiftKey, sorted.map((s) => s.name)); }}
							onDoubleClick={() => { if (entry.isDirectory) onEnterDirectory(entry.name); }}
						>
							<div className="w-8 flex items-center justify-center">
								{entry.isDirectory
									? <FolderIcon path={entry.name} size={18} className="shrink-0 text-primary" />
									: <FileIcon path={entry.name} filePath={entry.fullPath} size={18} className="shrink-0 text-secondary" />
								}
							</div>
							<div className="flex-1 font-body-md text-body-md text-on-surface truncate pr-4">{entry.name}</div>
							<div className="w-24 text-right font-body-md text-body-md text-on-surface-variant">
								{entry.isDirectory ? "--" : formatSize(entry.size)}
							</div>
							<div className="w-32 text-right font-body-md text-body-md text-on-surface-variant hidden xl:block">
								{formatDate(entry.modified)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
