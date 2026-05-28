import { useMemo } from "react";
import { t } from "../../../i18n";
import type { FileEntry } from "../../../shared/types";
import { useSort, type SortKey } from "../../hooks/useSort";
import { FileListHeader } from "./FileListHeader";
import { FileRow } from "./FileRow";
import { ToggleableError } from "./ToggleableError";

interface FileListProps {
	entries: FileEntry[];
	loading: boolean;
	error: string | null;
	errorDetail?: string;
	onEnterDirectory: (name: string) => void;
	onSelectEntry: (name: string, ctrlKey: boolean, shiftKey: boolean, sortedNames: string[]) => void;
	selectedNames: string[];
	onContextMenu?: (e: React.MouseEvent, entry: FileEntry) => void;
}

function compareEntries(a: FileEntry, b: FileEntry, key: SortKey): number {
	switch (key) {
		case "name":
			return a.name.localeCompare(b.name);
		case "size":
			return a.size - b.size;
		case "modified":
			return a.modified.localeCompare(b.modified);
		default:
			return 0;
	}
}

function partitionDirsFirst(entries: FileEntry[]): { head: FileEntry[]; tail: FileEntry[] } {
	const dirs = entries.filter((e) => e.isDirectory);
	const files = entries.filter((e) => !e.isDirectory);
	return { head: dirs, tail: files };
}

export function FileList({ entries, loading, error, errorDetail, onEnterDirectory, onSelectEntry, selectedNames, onContextMenu }: FileListProps) {
	const selectedSet = useMemo(() => new Set(selectedNames), [selectedNames]);

	const { sorted, config, handleSort } = useSort({
		items: entries,
		initialKey: "name",
		compare: compareEntries,
		partition: partitionDirsFirst,
	});

	if (loading) {
		return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">{t("file.loading")}</div>;
	}

	if (error) {
		return <ToggleableError message={error} detail={errorDetail} />;
	}

	if (sorted.length === 0) {
		return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">{t("file.empty")}</div>;
	}

	const sortedNames = sorted.map((s) => s.name);

	return (
		<div className="flex-1 flex flex-col overflow-hidden">
			<FileListHeader onSort={handleSort} sortKey={config.key} sortDir={config.direction} />
			<div className="flex-1 overflow-y-auto">
				{sorted.map((entry) => (
				<FileRow
					key={entry.name}
					entry={entry}
					isSelected={selectedSet.has(entry.name)}
					onClick={(e) => { onSelectEntry(entry.name, e.ctrlKey, e.shiftKey, sortedNames); }}
					onDoubleClick={() => { if (entry.isDirectory) onEnterDirectory(entry.name); }}
					onContextMenu={onContextMenu ? (e) => { onContextMenu(e, entry); } : undefined}
				/>
				))}
			</div>
		</div>
	);
}
