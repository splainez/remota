import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { useI18n } from "@renderer/hooks/useI18n";
import { useSidebar } from "@renderer/hooks/useSidbar";
import { cn } from "@renderer/lib/utils";

interface BrandButtonProps {
	onViewAll: () => void;
}

export function BrandButton({ onViewAll }: BrandButtonProps) {
	const { t } = useI18n();
	const { state } = useSidebar();
	const collapsed = state === "collapsed";

	return (
		<Button
			variant="ghost"
			size="default"
			className={cn(
				"h-auto w-full px-1 py-1 gap-2 rounded-lg hover:bg-sidebar-accent justify-start",
				collapsed && "justify-center",
			)}
			onClick={onViewAll}
			title={t("app.title")}
		>
			<span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
				<Icon name="server" size={20} />
			</span>
			{!collapsed && (
				<span className="flex-1 min-w-0 text-left">
					<span className="block text-sm font-semibold text-sidebar-foreground truncate">{t("app.title")}</span>
					<span className="text-xs text-sidebar-foreground/70 flex items-center gap-1">
						<span className="w-1.5 h-1.5 rounded-full bg-primary" />
						{t("app.ready")}
					</span>
				</span>
			)}
		</Button>
	);
}
