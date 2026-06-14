import { Icon } from "@renderer/components/icons/Icon";
import { useI18n } from "@renderer/hooks/useI18n";
import { useCallback, useEffect, useState } from "react";
import { VscChromeClose, VscChromeMaximize, VscChromeMinimize, VscChromeRestore } from "react-icons/vsc";

export function TitleBar() {
	const { t } = useI18n();
	const [maximized, setMaximized] = useState(false);

	useEffect(() => {
		void window.api.windowControls.isMaximized().then(setMaximized);
		const unsub = window.api.windowControls.onMaximizeChange(setMaximized);
		return unsub;
	}, []);

	const handleMinimize = useCallback(() => {
		void window.api.windowControls.minimize();
	}, []);

	const handleMaximize = useCallback(() => {
		void window.api.windowControls.maximize();
	}, []);

	const handleClose = useCallback(() => {
		void window.api.windowControls.close();
	}, []);

	return (
		<div className="flex shrink-0 z-50 items-center justify-between h-(--titlebar-height) bg-surface-container-low border-b border-outline-variant">
			<div className="titlebar-drag-region flex flex-1 items-center gap-2 h-full pl-3 min-w-0 drag">
				<span className="flex shrink-0 items-center text-primary">
					<Icon name="server" size={14} />
				</span>
				<span className="text-xs text-on-surface-variant text-center overflow-hidden text-ellipsis whitespace-nowrap">
					{t("app.title")}
				</span>
			</div>
			<div className="titlebar-no-drag-region flex shrink-0 h-full">
				<button
					type="button"
					className="hover:bg-surface-container-high hover:text-on-surface flex items-center justify-center w-11 h-full border-none bg-transparent text-on-surface-variant cursor-pointer transition-colors"
					aria-label="Minimize"
					onClick={handleMinimize}
				>
					<VscChromeMinimize size={12} />
				</button>
				<button
					type="button"
					className="hover:bg-surface-container-high hover:text-on-surface flex items-center justify-center w-11 h-full border-none bg-transparent text-on-surface-variant cursor-pointer transition-colors"
					aria-label={maximized ? "Restore" : "Maximize"}
					onClick={handleMaximize}
				>
					{maximized ? <VscChromeRestore size={12} /> : <VscChromeMaximize size={12} />}
				</button>
				<button
					type="button"
					className="hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center w-11 h-full border-none bg-transparent text-on-surface-variant cursor-pointer transition-colors"
					aria-label="Close"
					onClick={handleClose}
				>
					<VscChromeClose size={14} />
				</button>
			</div>
		</div>
	);
}
