import { useCallback } from "react";
import { t } from "../../../i18n";
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
	drives: string[];
	currentPath: string;
	isAtDriveRoot: boolean;
}

export function Toolbar({
	onGoBack,
	onGoForward,
	canGoBack,
	canGoForward,
	onNavigateUp,
	onRefresh,
	onNavigateTo,
	drives,
	currentPath,
	isAtDriveRoot,
}: ToolbarProps) {
	const upDisabled = isAtDriveRoot || !canGoUp(currentPath);

	const handleDriveChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			const value = e.target.value;
			if (value && value !== currentPath) {
				onNavigateTo(value);
			}
		},
		[onNavigateTo, currentPath],
	);

	const btnClass =
		"flex items-center justify-center size-7 border border-transparent rounded text-gray-500 hover:bg-gray-300 hover:border-gray-300 hover:text-gray-900 disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:border-transparent disabled:hover:text-gray-500";

	return (
		<div className="flex items-center gap-0.5 px-1 py-0.5 bg-white border-b border-gray-300 shrink-0 h-8">
			<button
				className={btnClass}
				onClick={onGoBack}
				disabled={!canGoBack}
				title={t("file.navigateBack")}
			>
				<Icon name="arrow-left" size={16} />
			</button>
			<button
				className={btnClass}
				onClick={onGoForward}
				disabled={!canGoForward}
				title={t("file.navigateForward")}
			>
				<Icon name="arrow-right" size={16} />
			</button>
			<button
				className={btnClass}
				onClick={onNavigateUp}
				disabled={upDisabled}
				title={t("file.navigateUp")}
			>
				<Icon name="arrow-up" size={16} />
			</button>
			{drives.length > 0 && (
				<select
					className="h-6 px-1 border border-gray-300 rounded bg-white text-gray-900 text-sm min-w-[60px] focus:outline-none focus:border-blue-500"
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
			<button className={btnClass} onClick={onRefresh} title={t("file.refresh")}>
				<Icon name="refresh" size={16} />
			</button>
		</div>
	);
}
