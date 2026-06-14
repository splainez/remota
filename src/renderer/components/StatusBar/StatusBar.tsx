import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { useI18n } from "@renderer/hooks/useI18n";

interface StatusBarProps {
	activeConnectionId: number | null;
	isTransferPanelVisible: boolean;
	onToggleTransferPanel: () => void;
}

export function StatusBar({ activeConnectionId, isTransferPanelVisible, onToggleTransferPanel }: StatusBarProps) {
	const { t } = useI18n();

	return (
		<footer className="h-8 w-full bg-surface-container-lowest border-t border-outline-variant flex items-center justify-between px-4 text-xs text-muted-foreground z-10">
			<div className="flex items-center gap-2">
				<span className="w-2 h-2 rounded-full bg-primary" />
				<span>{t("app.ready")}</span>
			</div>
			<div className="flex items-center gap-3">
				{activeConnectionId != null && !isTransferPanelVisible && (
					<Button variant="link" size="sm" className="h-auto p-0 text-xs gap-1" onClick={onToggleTransferPanel}>
						<Icon name="sync" size={14} />
						{t("transfer.active")}
					</Button>
				)}
				<span>{t("app.version")}</span>
			</div>
		</footer>
	);
}
