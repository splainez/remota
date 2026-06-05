import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { useI18n } from "@renderer/hooks/useI18n";
import { cn } from "@renderer/lib/utils";

import { ThemeSelect } from "./ThemeSelect";

interface SidebarFooterProps {
	collapsed: boolean;
	onToggleCollapse: () => void;
	onSettings: () => void;
}

export function SidebarFooter({ collapsed, onToggleCollapse, onSettings }: SidebarFooterProps) {
	const { t } = useI18n();
	return (
		<div
			className={cn(
				"flex flex-col gap-2 w-full mt-auto pt-3 border-t border-outline-variant",
				collapsed ? "items-center" : "",
			)}
		>
			<Button
				variant="ghost"
				size="icon"
				className={cn(
					"rounded-full hover:rounded-xl text-on-surface-variant hover:text-primary",
					!collapsed && "self-start",
				)}
				aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
				title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
				onClick={onToggleCollapse}
			>
				<Icon name={collapsed ? "arrow-right" : "arrow-left"} size={16} />
			</Button>
			<div className={cn("flex items-center gap-2", collapsed ? "flex-col" : "flex-row")}>
				<ThemeSelect />
				{!collapsed && (
					<Button
						variant="ghost"
						size="icon"
						className="rounded-full hover:rounded-xl text-on-surface-variant hover:text-primary"
						aria-label={t("navigation.settings")}
						title={t("navigation.settings")}
						onClick={onSettings}
					>
						<Icon name="settings" size={16} />
					</Button>
				)}
				{!collapsed && (
					<div className="w-10 h-10 rounded-full overflow-hidden hover:rounded-xl transition-all duration-300 ring-2 ring-transparent hover:ring-primary flex items-center justify-center bg-surface-container-highest">
						<Icon name="person" size={16} className="text-on-surface-variant" />
					</div>
				)}
			</div>
		</div>
	);
}
