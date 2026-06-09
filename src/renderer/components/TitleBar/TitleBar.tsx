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
		<div className="titlebar">
			<div className="titlebar-drag-region">
				<span className="titlebar-icon">
					<Icon name="server" size={14} />
				</span>
				<span className="titlebar-title">{t("app.title")}</span>
			</div>
			<div className="titlebar-controls">
				<button type="button" className="titlebar-button" aria-label="Minimize" onClick={handleMinimize}>
					<VscChromeMinimize size={12} />
				</button>
				<button
					type="button"
					className="titlebar-button"
					aria-label={maximized ? "Restore" : "Maximize"}
					onClick={handleMaximize}
				>
					{maximized ? <VscChromeRestore size={12} /> : <VscChromeMaximize size={12} />}
				</button>
				<button
					type="button"
					className="titlebar-button titlebar-button-close"
					aria-label="Close"
					onClick={handleClose}
				>
					<VscChromeClose size={14} />
				</button>
			</div>
		</div>
	);
}
