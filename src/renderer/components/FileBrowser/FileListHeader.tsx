import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { useI18n } from "@renderer/hooks/useI18n";
import type { SortKey, SortDir } from "@renderer/hooks/useSort";
import { cn } from "@renderer/lib/utils";

interface FileListHeaderProps {
	onSort: (key: SortKey) => void;
	sortKey: SortKey;
	sortDir: SortDir;
}

export function FileListHeader({ onSort, sortDir, sortKey }: FileListHeaderProps) {
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
		</div>
	);
}
