import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { useI18n } from "@renderer/hooks/useI18n";
import { useSidebar } from "@renderer/hooks/useSidbar";
import { cn } from "@renderer/lib/utils";

import { ThemeSelect } from "./ThemeSelect";

interface ServerSidebarFooterProps {
	onSettings: () => void;
}

export function ServerSidebarFooter({ onSettings }: ServerSidebarFooterProps) {
	const { t } = useI18n();
	const { state, toggleSidebar } = useSidebar();
	const collapsed = state === "collapsed";

	return (
		<div
			className={cn(
				"flex flex-col gap-2 w-full mt-auto pt-3 border-t border-sidebar-border",
				collapsed ? "items-center" : "",
			)}
		>
			<div className="flex flex-row content-between">
				<Button
					variant="ghost"
					size="icon"
					className={cn(
						"rounded-full hover:rounded-xl text-sidebar-foreground/70 hover:text-sidebar-primary",
					)}
					aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
					title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
					onClick={toggleSidebar}
				>
					<Icon name={collapsed ? "arrow-right" : "arrow-left"} size={16} />
				</Button>
				{!collapsed && <>
					<Button
						variant="ghost"
						size="icon"
						className={cn(
							"rounded-full hover:rounded-xl text-sidebar-foreground/70 hover:text-sidebar-primary",
						)}
						aria-label={t("navigation.settings")}
						title={t("navigation.settings")}
						onClick={onSettings}
					>
						<Icon name="settings" size={16} />
					</Button>
					<ThemeSelect />
				</>}
			</div>
		</div>
	);
}
