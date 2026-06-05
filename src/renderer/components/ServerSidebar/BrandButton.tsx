import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { useI18n } from "@renderer/hooks/useI18n";
import { cn } from "@renderer/lib/utils";

interface BrandButtonProps {
	collapsed: boolean;
	onViewAll: () => void;
}

export function BrandButton({ collapsed, onViewAll }: BrandButtonProps) {
	const { t } = useI18n();
	return (
		<Button
			variant="ghost"
			size="default"
			className={cn(
				"h-auto w-full px-1 py-1 gap-2 rounded-lg hover:bg-surface-container justify-start",
				collapsed && "justify-center",
			)}
			onClick={onViewAll}
			title={t("app.title")}
		>
			<span className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-sm">
				<Icon name="server" size={20} />
			</span>
			{!collapsed && (
				<span className="flex-1 min-w-0 text-left">
					<span className="block text-sm font-semibold text-on-surface truncate">{t("app.title")}</span>
					<span className="text-[10px] text-muted-foreground flex items-center gap-1">
						<span className="w-1.5 h-1.5 rounded-full bg-primary" />
						{t("app.ready")}
					</span>
				</span>
			)}
		</Button>
	);
}
