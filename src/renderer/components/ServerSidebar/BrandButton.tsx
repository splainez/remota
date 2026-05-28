import { t } from "../../../i18n";
import { Icon } from "../icons/Icon";

interface BrandButtonProps {
	collapsed: boolean;
	onViewAll: () => void;
}

export function BrandButton({ collapsed, onViewAll }: BrandButtonProps) {
	return (
		<div
			className={`flex items-center gap-2 cursor-pointer hover:bg-surface-container rounded-lg transition-colors ${collapsed ? "justify-center" : "px-1 py-1"}`}
			onClick={onViewAll}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onViewAll(); }}
		>
			<button
				className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:rounded-lg transition-all duration-300 ease-in-out shadow-sm shrink-0"
				title={t("app.title")}
				tabIndex={-1}
			>
				<Icon name="server" size={20} />
			</button>
			{!collapsed && (
				<div className="flex-1 min-w-0">
					<div className="text-sm font-semibold text-on-surface truncate">{t("app.title")}</div>
					<div className="text-[10px] text-muted-foreground flex items-center gap-1">
						<span className="w-1.5 h-1.5 rounded-full bg-primary" />
						{t("app.ready")}
					</div>
				</div>
			)}
		</div>
	);
}
