import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { useI18n } from "@renderer/hooks/useI18n";
import { canGoUp } from "@renderer/lib/utils";
import { useCallback } from "react";

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
	selectedDrive: string | null;
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
	selectedDrive,
	filter,
	onFilterChange,
}: ToolbarProps) {
	const { t } = useI18n();
	const upDisabled = !canGoUp(currentPath);

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

	return (
		<div className="h-9 border-b border-outline-variant bg-surface flex items-center px-3 justify-between shrink-0">
			<div className="flex items-center gap-1">
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onNavigateUp}
					disabled={upDisabled}
					aria-label={t("file.navigateUp")}
					title={t("file.navigateUp")}
				>
					<Icon name="arrow-up" size={16} />
				</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onRefresh}
					aria-label={t("file.refresh")}
					title={t("file.refresh")}
				>
					<Icon name="refresh" size={16} />
				</Button>
				{onToggleTerminal && (
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={onToggleTerminal}
						aria-label={t("terminal.toggle")}
						title={t("terminal.toggle")}
						aria-pressed={terminalVisible}
						className={terminalVisible ? "text-primary" : undefined}
					>
						<Icon name="terminal" size={16} />
					</Button>
				)}
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => {
						/* New folder - no-op for now */
					}}
					aria-label={t("file.newFolder")}
					title={t("file.newFolder")}
				>
					<Icon name="new-folder" size={16} />
				</Button>
				{drives.length > 0 && (
					<select
						className="h-6 px-1.5 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-xs min-w-[60px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
						value={selectedDrive ?? ""}
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
					<Button
						variant="ghost"
						size="icon-xs"
						className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full"
						onClick={() => {
							onFilterChange("");
						}}
						aria-label={t("file.clearFilter")}
						title={t("file.clearFilter")}
					>
						<Icon name="close" size={12} />
					</Button>
				)}
			</div>
		</div>
	);
}
