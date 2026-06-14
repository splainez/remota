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
				"h-auto w-full justify-start gap-2 rounded-lg p-1 hover:bg-sidebar-accent",
				collapsed && "justify-center",
			)}
			onClick={onViewAll}
			title={t("app.title")}
		>
			<span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
				<Icon name="app-icon" size={20} />
			</span>
			{!collapsed && (
				<span className="min-w-0 flex-1 text-left">
					<span className="block truncate text-sm font-semibold text-sidebar-foreground">{t("app.title")}</span>
					<span className="flex items-center gap-1 text-xs text-sidebar-foreground/70">
						<span className="size-1.5 rounded-full bg-primary" />
						{t("app.ready")}
					</span>
				</span>
			)}
		</Button>
	);
}
