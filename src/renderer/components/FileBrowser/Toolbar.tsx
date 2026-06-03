import { useCallback } from "react";
import { useI18n } from "../../hooks/useI18n";
import { Icon } from "../icons/Icon";
import { canGoUp } from "../../lib/utils";

interface ToolbarProps {
	onGoBack: () => void;
	onGoForward: () => void;
	canGoBack: boolean;
	canGoForward: boolean;
	onNavigateUp: () => void;
	onRefresh: () => void;
	onNavigateTo: (path: string) => void;
	onToggleTerminal?: () => void;
	terminalVisible?: boolean;
	drives: string[];
	currentPath: string;
	isAtDriveRoot: boolean;
	filter: string;
	onFilterChange: (value: string) => void;
}

export function Toolbar({
	onNavigateUp,
	onRefresh,
	onNavigateTo,
	onToggleTerminal,
	terminalVisible,
	drives,
	currentPath,
	isAtDriveRoot,
	filter,
	onFilterChange,
}: ToolbarProps) {
	const { t } = useI18n();
	const upDisabled = isAtDriveRoot || !canGoUp(currentPath);

	const handleDriveChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			const value = e.target.value;
			if (value && value !== currentPath) {
				onNavigateTo(value);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps -- onNavigateTo omitted to avoid loop
		[currentPath],
	);

	const btnClass =
		"p-1 rounded hover:bg-surface-container-high text-on-surface-variant transition-colors flex items-center justify-center";

	return (
		<div className="h-9 border-b border-outline-variant bg-surface flex items-center px-3 justify-between shrink-0">
			<div className="flex items-center gap-1">
				<button className={btnClass} onClick={onNavigateUp} disabled={upDisabled} title={t("file.navigateUp")}>
					<Icon name="arrow-up" size={16} />
				</button>
				<button className={btnClass} onClick={onRefresh} title={t("file.refresh")}>
					<Icon name="refresh" size={16} />
				</button>
				{onToggleTerminal && (
					<button
						className={`${btnClass} ${terminalVisible ? "text-primary" : ""}`}
						onClick={onToggleTerminal}
						title={t("terminal.toggle")}
					>
						<Icon name="terminal" size={16} />
					</button>
				)}
				<button
					className={btnClass}
					onClick={() => {
						/* New folder - no-op for now */
					}}
					title={t("file.newFolder")}
				>
					<Icon name="new-folder" size={16} />
				</button>
				{drives.length > 0 && (
					<select
						className="h-6 px-1.5 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-xs min-w-[60px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
						value={isAtDriveRoot ? currentPath : ""}
						onChange={handleDriveChange}
						title={t("file.selectDrive")}
					>
						<option value="" disabled>
							{t("file.selectDrive")}
						</option>
						{drives.map((d) => (
							<option key={d} value={d}>
								{d}
							</option>
						))}
					</select>
				)}
			</div>
			<div className="relative">
				<Icon name="search" size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant" />
				<input
					className="pl-7 pr-6 py-0.5 h-6 text-sm bg-surface-container-lowest border border-outline-variant rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all w-40"
					placeholder={t("file.filter")}
					type="text"
					value={filter}
					onChange={(e) => {
						onFilterChange(e.target.value);
					}}
				/>
				{filter && (
					<button
						className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
						onClick={() => {
							onFilterChange("");
						}}
						title={t("file.clearFilter")}
					>
						<Icon name="close" size={12} />
					</button>
				)}
			</div>
		</div>
	);
}
