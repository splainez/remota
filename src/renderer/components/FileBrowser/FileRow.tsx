import { FileIcon } from "@renderer/components/icons/FileIcon";
import { FolderIcon } from "@renderer/components/icons/FolderIcon";
import { Input } from "@renderer/components/ui/input";
import { formatSize, formatDate, formatMode } from "@renderer/lib/file-utils";
import type { FileColumnId } from "@shared/app-config-schema";
import type { FileEntry } from "@shared/types";
import { useEffect, useRef, useState } from "react";

interface FileRowProps {
	entry: FileEntry;
	isSelected: boolean;
	isTypeAheadFocused?: boolean;
	isEditing?: boolean;
	onClick: (e: React.MouseEvent) => void;
	onDoubleClick: () => void;
	onContextMenu?: (e: React.MouseEvent) => void;
	onCommitRename?: (newName: string) => void;
	onCancelRename?: () => void;
	visibleColumns: FileColumnId[];
}

export function FileRow({
	entry,
	isSelected,
	isTypeAheadFocused,
	isEditing = false,
	onClick,
	onDoubleClick,
	onContextMenu,
	onCommitRename,
	onCancelRename,
	visibleColumns,
}: FileRowProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const committedRef = useRef(false);
	const [draftName, setDraftName] = useState(entry.name);

	useEffect(() => {
		if (isEditing) {
			committedRef.current = false;
			setDraftName(entry.name);
		}
	}, [isEditing, entry.name]);

	useEffect(() => {
		if (!isEditing) return;
		const input = inputRef.current;
		if (!input) return;
		input.focus();
		input.select();
	}, [isEditing]);

	const commit = () => {
		if (committedRef.current) return;
		committedRef.current = true;
		onCommitRename?.(draftName.trim());
	};

	const cancel = () => {
		setDraftName(entry.name);
		onCancelRename?.();
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			commit();
		} else if (e.key === "Escape") {
			e.preventDefault();
			cancel();
		}
	};

	return (
		<div
			data-file-name={entry.name}
			className={[
				"flex px-3 py-1.5 border-b border-outline-variant/20 cursor-pointer group items-center transition-colors",
				isSelected ? "bg-primary-fixed-dim/20" : "hover:bg-surface-container-low",
				isTypeAheadFocused ? "outline outline-1 outline-primary" : "",
			].join(" ")}
			onClick={isEditing ? undefined : onClick}
			onDoubleClick={isEditing ? undefined : onDoubleClick}
			onContextMenu={isEditing ? undefined : onContextMenu}
		>
			<div className="flex w-7 items-center justify-center">
				{entry.isDirectory ? (
					<FolderIcon path={entry.name} size={16} className="shrink-0 text-primary" />
				) : (
					<FileIcon path={entry.name} filePath={entry.fullPath} size={16} className="shrink-0 text-secondary" />
				)}
			</div>
			{visibleColumns.includes("name") &&
				(isEditing ? (
					<Input
						ref={inputRef}
						data-testid="rename-input"
						value={draftName}
						className="mr-3 h-6 flex-1 px-1.5 py-0 text-sm"
						onChange={(e) => {
							setDraftName(e.target.value);
						}}
						onKeyDown={handleKeyDown}
						onBlur={commit}
						onClick={(e) => {
							e.stopPropagation();
						}}
						onDoubleClick={(e) => {
							e.stopPropagation();
						}}
					/>
				) : (
					<div className="flex-1 truncate pr-3 text-sm text-on-surface">{entry.name}</div>
				))}
			{visibleColumns.includes("size") && (
				<div className="w-20 px-2 text-right text-xs text-on-surface-variant">
					{entry.isDirectory ? "--" : formatSize(entry.size)}
				</div>
			)}
			{visibleColumns.includes("modified") && (
				<div className="hidden w-28 px-2 text-right text-xs text-on-surface-variant xl:block">
					{formatDate(entry.modified)}
				</div>
			)}
			{visibleColumns.includes("permissions") && (
				<div className="hidden w-24 px-2 text-left font-mono text-xs text-on-surface-variant xl:block">
					{entry.mode != null ? formatMode(entry.mode) : "\u2014"}
				</div>
			)}
			{visibleColumns.includes("owner") && (
				<div className="hidden w-16 px-2 text-right text-xs text-on-surface-variant xl:block">
					{entry.ownerName ?? (entry.uid != null ? String(entry.uid) : "\u2014")}
				</div>
			)}
			{visibleColumns.includes("group") && (
				<div className="hidden w-16 px-2 text-right text-xs text-on-surface-variant xl:block">
					{entry.groupName ?? (entry.gid != null ? String(entry.gid) : "\u2014")}
				</div>
			)}
		</div>
	);
}
