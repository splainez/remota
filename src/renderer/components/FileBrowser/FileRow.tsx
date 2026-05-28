import type { FileEntry } from "../../../shared/types";
import { FileIcon } from "../icons/FileIcon";
import { FolderIcon } from "../icons/FolderIcon";
import { formatSize, formatDate } from "../../lib/file-utils";

interface FileRowProps {
	entry: FileEntry;
	isSelected: boolean;
	onClick: (e: React.MouseEvent) => void;
	onDoubleClick: () => void;
	onContextMenu?: (e: React.MouseEvent) => void;
}

export function FileRow({ entry, isSelected, onClick, onDoubleClick, onContextMenu }: FileRowProps) {
	return (
		<div
			className={[
				"flex px-3 py-1.5 border-b border-outline-variant/20 cursor-pointer group items-center transition-colors",
				isSelected ? "bg-primary-fixed-dim/20" : "hover:bg-surface-container-low",
			].join(" ")}
			onClick={onClick}
			onDoubleClick={onDoubleClick}
			onContextMenu={onContextMenu}
		>
			<div className="w-7 flex items-center justify-center">
				{entry.isDirectory
					? <FolderIcon path={entry.name} size={16} className="shrink-0 text-primary" />
					: <FileIcon path={entry.name} filePath={entry.fullPath} size={16} className="shrink-0 text-secondary" />
				}
			</div>
			<div className="flex-1 text-sm text-on-surface truncate pr-3">{entry.name}</div>
			<div className="w-20 text-right text-xs text-on-surface-variant">
				{entry.isDirectory ? "--" : formatSize(entry.size)}
			</div>
			<div className="w-28 text-right text-xs text-on-surface-variant hidden xl:block">
				{formatDate(entry.modified)}
			</div>
		</div>
	);
}
