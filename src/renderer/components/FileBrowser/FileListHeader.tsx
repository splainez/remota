import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { useI18n } from "@renderer/hooks/useI18n";
import type { SortKey, SortDir } from "@renderer/hooks/useSort";
import { cn } from "@renderer/lib/utils";
import type { FileColumnId } from "@shared/app-config-schema";

interface FileListHeaderProps {
	onSort: (key: SortKey) => void;
	sortKey: SortKey;
	sortDir: SortDir;
	visibleColumns: FileColumnId[];
}

export function FileListHeader({ onSort, sortDir, sortKey, visibleColumns }: FileListHeaderProps) {
	const { t } = useI18n();
	const sortIndicator = (key: SortKey) => {
		if (sortKey !== key) return null;
		return sortDir === "asc" ? (
			<Icon name="triangle-up" size={8} className="ml-0.5" data-testid="sort-asc" />
		) : (
			<Icon name="triangle-down" size={8} className="ml-0.5" data-testid="sort-desc" />
		);
	};

	return (
		<div
			className="
				flex shrink-0 border-b border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs
				text-on-surface-variant select-none
			"
		>
			<div className="w-7" />
			{visibleColumns.includes("name") && (
				<Button
					variant="ghost"
					size="sm"
					className={cn("flex-1 justify-start px-2 font-semibold text-on-surface-variant hover:text-on-surface")}
					onClick={() => {
						onSort("name");
					}}
				>
					{t("file.name")}
					{sortIndicator("name")}
				</Button>
			)}
			{visibleColumns.includes("size") && (
				<Button
					variant="ghost"
					size="sm"
					className="w-20 justify-end px-2 font-semibold text-on-surface-variant hover:text-on-surface"
					onClick={() => {
						onSort("size");
					}}
				>
					{t("file.size")}
					{sortIndicator("size")}
				</Button>
			)}
			{visibleColumns.includes("modified") && (
				<Button
					variant="ghost"
					size="sm"
					className="hidden w-28 justify-end px-2 font-semibold text-on-surface-variant hover:text-on-surface xl:flex"
					onClick={() => {
						onSort("modified");
					}}
				>
					{t("file.modified")}
					{sortIndicator("modified")}
				</Button>
			)}
			{visibleColumns.includes("permissions") && (
				<Button
					variant="ghost"
					size="sm"
					className="hidden w-24 justify-start px-2 font-semibold text-on-surface-variant hover:text-on-surface xl:flex"
					onClick={() => {
						onSort("permissions");
					}}
				>
					{t("file.permissions")}
					{sortIndicator("permissions")}
				</Button>
			)}
			{visibleColumns.includes("owner") && (
				<Button
					variant="ghost"
					size="sm"
					className="hidden w-16 justify-end px-2 font-semibold text-on-surface-variant hover:text-on-surface xl:flex"
					onClick={() => {
						onSort("owner");
					}}
				>
					{t("file.owner")}
					{sortIndicator("owner")}
				</Button>
			)}
			{visibleColumns.includes("group") && (
				<Button
					variant="ghost"
					size="sm"
					className="hidden w-16 justify-end px-2 font-semibold text-on-surface-variant hover:text-on-surface xl:flex"
					onClick={() => {
						onSort("group");
					}}
				>
					{t("file.group")}
					{sortIndicator("group")}
				</Button>
			)}
		</div>
	);
}
