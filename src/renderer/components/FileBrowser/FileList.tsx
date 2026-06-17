import { FileIcon } from "@renderer/components/icons/FileIcon";
import { FolderIcon } from "@renderer/components/icons/FolderIcon";
import { Input } from "@renderer/components/ui/input";
import { useI18n } from "@renderer/hooks/useI18n";
import { useSort, type SortKey } from "@renderer/hooks/useSort";
import type { FileEntry } from "@shared/types";
import { useEffect, useMemo, useRef, useState } from "react";

import { FileListHeader } from "./FileListHeader";
import { FileRow } from "./FileRow";
import { ToggleableError } from "./ToggleableError";

type CreateType = "folder" | "file";

interface FileListProps {
	entries: FileEntry[];
	loading: boolean;
	error: string | null;
	errorDetail?: string;
	onEnterDirectory: (name: string) => void;
	onOpenFile?: (entry: FileEntry) => void;
	onSelectEntry: (name: string, ctrlKey: boolean, shiftKey: boolean, sortedNames: string[]) => void;
	selectedNames: string[];
	typeAheadName?: string | null;
	scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
	onContextMenu?: (e: React.MouseEvent, entry: FileEntry) => void;
	editingName?: string | null;
	onCommitRename?: (entry: FileEntry, newName: string) => void;
	onCancelRename?: () => void;
	creatingType?: CreateType | null;
	onCommitCreate?: (name: string) => void;
	onCancelCreate?: () => void;
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

export function FileList({
	entries,
	loading,
	error,
	errorDetail,
	onEnterDirectory,
	onOpenFile,
	onSelectEntry,
	selectedNames,
	typeAheadName,
	scrollContainerRef,
	onContextMenu,
	editingName,
	onCommitRename,
	onCancelRename,
	creatingType,
	onCommitCreate,
	onCancelCreate,
}: FileListProps) {
	const { t } = useI18n();
	const selectedSet = useMemo(() => new Set(selectedNames), [selectedNames]);
	const createInputRef = useRef<HTMLInputElement>(null);
	const [createDraftName, setCreateDraftName] = useState("");
	const lastCommittedNameRef = useRef<string | null>(null);

	useEffect(() => {
		if (creatingType != null) {
			lastCommittedNameRef.current = null;
			setCreateDraftName(creatingType === "folder" ? "New Folder" : "New File");
		}
	}, [creatingType]);

	useEffect(() => {
		if (creatingType == null) return;
		const input = createInputRef.current;
		if (!input) return;
		input.focus();
		input.select();
	}, [creatingType]);

	const commitCreate = () => {
		const name = createDraftName.trim();
		if (name === lastCommittedNameRef.current) return;
		lastCommittedNameRef.current = name;
		onCommitCreate?.(name);
	};

	const cancelCreate = () => {
		setCreateDraftName("");
		onCancelCreate?.();
	};

	const { sorted, config, handleSort } = useSort({
		items: entries,
		initialKey: "name",
		compare: compareEntries,
		partition: partitionDirsFirst,
	});

	if (loading && entries.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">{t("file.loading")}</div>
		);
	}

	if (error) {
		return <ToggleableError message={error} detail={errorDetail} />;
	}

	if (sorted.length === 0 && creatingType == null) {
		return (
			<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">{t("file.empty")}</div>
		);
	}

	const sortedNames = sorted.map((s) => s.name);

	const handleCreateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			commitCreate();
		} else if (e.key === "Escape") {
			e.preventDefault();
			cancelCreate();
		}
	};

	return (
		<div className="flex flex-1 flex-col overflow-hidden">
			<FileListHeader onSort={handleSort} sortKey={config.key} sortDir={config.direction} />
			<div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
				{creatingType != null && (
					<div
						className={[
							"flex px-3 py-1.5 border-b border-outline-variant/20 cursor-pointer group items-center transition-colors",
							"hover:bg-surface-container-low",
						].join(" ")}
					>
						<div className="flex w-7 items-center justify-center">
							{creatingType === "folder" ? (
								<FolderIcon path="new" size={16} className="shrink-0 text-primary" />
							) : (
								<FileIcon path="new" filePath="" size={16} className="shrink-0 text-secondary" />
							)}
						</div>
						<Input
							ref={createInputRef}
							data-testid="create-input"
							value={createDraftName}
							className="mr-3 h-6 flex-1 px-1.5 py-0 text-sm"
							onChange={(e) => {
								setCreateDraftName(e.target.value);
							}}
							onKeyDown={handleCreateKeyDown}
							onBlur={commitCreate}
							onClick={(e) => {
								e.stopPropagation();
							}}
							onDoubleClick={(e) => {
								e.stopPropagation();
							}}
						/>
						<div className="w-20 text-right text-xs text-on-surface-variant">
							{creatingType === "folder" ? "--" : "0 B"}
						</div>
						<div className="hidden w-28 text-right text-xs text-on-surface-variant xl:block" />
					</div>
				)}
				{sorted.map((entry) => (
					<FileRow
						key={entry.name}
						entry={entry}
						isSelected={selectedSet.has(entry.name)}
						isTypeAheadFocused={typeAheadName === entry.name}
						isEditing={editingName === entry.name}
						onClick={(e) => {
							onSelectEntry(entry.name, e.ctrlKey, e.shiftKey, sortedNames);
						}}
						onDoubleClick={() => {
							if (entry.isDirectory) {
								onEnterDirectory(entry.name);
							} else {
								onOpenFile?.(entry);
							}
						}}
						onContextMenu={
							onContextMenu
								? (e) => {
										onContextMenu(e, entry);
									}
								: undefined
						}
						onCommitRename={
							onCommitRename
								? (newName) => {
										onCommitRename(entry, newName);
									}
								: undefined
						}
						onCancelRename={onCancelRename}
					/>
				))}
			</div>
		</div>
	);
}
