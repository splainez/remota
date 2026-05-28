import { t } from "../../../i18n";
import { Icon } from "../icons/Icon";
import type { SortKey, SortDir } from "../../hooks/useSort";

interface FileListHeaderProps {
	onSort: (key: SortKey) => void;
	sortKey: SortKey;
	sortDir: SortDir;
}

export function FileListHeader({ onSort, sortDir, sortKey }: FileListHeaderProps) {
	const sortIndicator = (key: SortKey) => {
		if (sortKey !== key) return null;
		return sortDir === "asc"
			? <Icon name="triangle-up" size={8} className="ml-0.5" data-testid="sort-asc" />
			: <Icon name="triangle-down" size={8} className="ml-0.5" data-testid="sort-desc" />;
	};

	return (
		<div className="flex px-3 py-1.5 border-b border-outline-variant bg-surface-container-lowest text-xs text-on-surface-variant select-none shrink-0">
			<div className="w-7" />
			<button
				className="flex-1 cursor-pointer hover:text-on-surface flex items-center gap-0.5 text-left font-semibold"
				onClick={() => { onSort("name"); }}
			>
				{t("file.name")}{sortIndicator("name")}
			</button>
			<button
				className="w-20 text-right cursor-pointer hover:text-on-surface font-semibold"
				onClick={() => { onSort("size"); }}
			>
				{t("file.size")}{sortIndicator("size")}
			</button>
			<button
				className="w-28 text-right cursor-pointer hover:text-on-surface hidden xl:block font-semibold"
				onClick={() => { onSort("modified"); }}
			>
				{t("file.modified")}{sortIndicator("modified")}
			</button>
		</div>
	);
}
