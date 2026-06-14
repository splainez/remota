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
		<div className="flex h-9 shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-3">
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
						className="
							h-6 min-w-[60px] rounded-sm border border-outline-variant bg-surface-container-lowest px-1.5 text-xs
							text-on-surface transition-all
							focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none
						"
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
				<Icon name="search" size={14} className="absolute top-1/2 left-2 -translate-y-1/2 text-on-surface-variant" />
				<input
					className="
						h-6 w-40 rounded-sm border border-outline-variant bg-surface-container-lowest py-0.5 pr-6 pl-7 text-sm
						transition-all
						focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none
					"
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
						className="absolute top-1/2 right-1 -translate-y-1/2 rounded-full"
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
