import { Icon } from "@renderer/components/icons/Icon";
import { useI18n } from "@renderer/hooks/useI18n";
import { useTransferPanelStore } from "@renderer/store/transferPanel";
import { useCallback } from "react";

interface TransferHeaderProps {
	pendingCount: number;
	onClose: () => void;
}

function TransferHeader({ pendingCount, onClose }: TransferHeaderProps) {
	const { t } = useI18n();
	return (
		<div className="h-10 px-4 flex justify-between items-center border-b border-outline-variant bg-surface-container-highest shrink-0">
			<div className="flex items-center gap-2">
				<Icon name="sync" size={16} className="text-primary" />
				<h2 className="text-sm font-semibold text-on-surface">{t("transfer.active")}</h2>
				<span className="bg-primary-fixed text-primary px-1.5 py-0.5 rounded text-xs ml-1">
					{pendingCount} {t("transfer.pending")}
				</span>
			</div>
			<div className="flex gap-1">
				<button
					className="p-1 rounded hover:bg-surface-container-low text-on-surface-variant transition-colors"
					title={t("transfer.pauseAll")}
				>
					<Icon name="sync" size={16} />
				</button>
				<button
					className="p-1 rounded hover:bg-surface-container-low text-on-surface-variant transition-colors"
					title={t("transfer.close")}
					onClick={onClose}
				>
					<Icon name="close" size={16} />
				</button>
			</div>
		</div>
	);
}

function EmptyState() {
	const { t } = useI18n();
	return (
		<div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-on-surface-variant">
			<Icon name="sync" size={32} className="opacity-40" />
			<div className="text-sm font-medium">{t("transfer.empty")}</div>
			<div className="text-xs opacity-80 text-center max-w-xs">{t("transfer.emptyHint")}</div>
		</div>
	);
}

interface ActiveTransfersProps {
	connectionId: number;
}

export function ActiveTransfers({ connectionId }: ActiveTransfersProps) {
	const { t } = useI18n();
	const setVisible = useTransferPanelStore((s) => s.setVisible);

	const handleClose = useCallback(() => {
		setVisible(connectionId, false);
	}, [connectionId, setVisible]);

	return (
		<section className="h-full flex flex-col bg-surface-container min-h-0">
			<TransferHeader pendingCount={0} onClose={handleClose} />
			<div className="flex-1 overflow-y-auto p-3 min-h-0" aria-label={t("transfer.active")}>
				<EmptyState />
			</div>
		</section>
	);
}
