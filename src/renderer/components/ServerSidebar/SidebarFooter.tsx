import { Icon } from "@renderer/components/icons/Icon";
import { useI18n } from "@renderer/hooks/useI18n";

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
			className={`flex flex-col gap-2 w-full mt-auto pt-3 border-t border-outline-variant ${collapsed ? "items-center" : ""}`}
		>
			<button
				className={`w-10 h-10 rounded-full hover:bg-surface-container hover:rounded-xl transition-all duration-300 flex items-center justify-center text-on-surface-variant hover:text-primary ${collapsed ? "" : "self-start"}`}
				title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
				onClick={onToggleCollapse}
			>
				<Icon name={collapsed ? "arrow-right" : "arrow-left"} size={16} />
			</button>
			<div className={`flex items-center gap-2 ${collapsed ? "flex-col" : "flex-row"}`}>
				<ThemeSelect />
				{!collapsed && (
					<button
						className="w-10 h-10 rounded-full hover:bg-surface-container hover:rounded-xl transition-all duration-300 flex items-center justify-center text-on-surface-variant hover:text-primary"
						title={t("navigation.settings")}
						onClick={onSettings}
					>
						<Icon name="settings" size={16} />
					</button>
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
