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
		<footer
			className="
				z-10 flex h-8 w-full items-center justify-between border-t border-outline-variant bg-surface-container-lowest
				px-4 text-xs text-muted-foreground
			"
		>
			<div className="flex items-center gap-2">
				<span className="size-2 rounded-full bg-primary" />
				<span>{t("app.ready")}</span>
			</div>
			<div className="flex items-center gap-3">
				{activeConnectionId != null && !isTransferPanelVisible && (
					<Button variant="link" size="sm" className="h-auto gap-1 p-0 text-xs" onClick={onToggleTransferPanel}>
						<Icon name="sync" size={14} />
						{t("transfer.active")}
					</Button>
				)}
				<span>{t("app.version", { version: __APP_VERSION__ })}</span>
			</div>
		</footer>
	);
}
