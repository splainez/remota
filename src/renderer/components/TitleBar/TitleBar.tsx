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
		<div
			className="
				z-50 flex h-(--titlebar-height) w-full shrink-0 items-center justify-between border-b border-outline-variant
				bg-surface-container-low
			"
		>
			<div className="flex h-full min-w-0 flex-1 items-center gap-2 pl-3">
				<span className="flex shrink-0 items-center text-primary">
					<Icon name="app-icon" size={14} />
				</span>
				<span className="truncate text-center text-xs text-on-surface-variant">{t("app.title")}</span>
			</div>
			<div className="flex h-full shrink-0">
				<button
					type="button"
					className="
						flex h-full w-11 cursor-pointer items-center justify-center border-none bg-transparent
						text-on-surface-variant transition-colors
						hover:bg-surface-container-high hover:text-on-surface
					"
					aria-label="Minimize"
					onClick={handleMinimize}
				>
					<VscChromeMinimize size={12} />
				</button>
				<button
					type="button"
					className="
						flex h-full w-11 cursor-pointer items-center justify-center border-none bg-transparent
						text-on-surface-variant transition-colors
						hover:bg-surface-container-high hover:text-on-surface
					"
					aria-label={maximized ? "Restore" : "Maximize"}
					onClick={handleMaximize}
				>
					{maximized ? <VscChromeRestore size={12} /> : <VscChromeMaximize size={12} />}
				</button>
				<button
					type="button"
					className="
						flex h-full w-11 cursor-pointer items-center justify-center border-none bg-transparent
						text-on-surface-variant transition-colors
						hover:bg-destructive hover:text-destructive-foreground
					"
					aria-label="Close"
					onClick={handleClose}
				>
					<VscChromeClose size={14} />
				</button>
			</div>
		</div>
	);
}
