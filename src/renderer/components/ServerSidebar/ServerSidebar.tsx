import { useMemo, useState } from "react";
import { useI18n } from "../../hooks/useI18n";
import type { Connection } from "../../../shared/types";
import { Icon } from "../icons/Icon";
import { BrandButton } from "./BrandButton";
import { SidebarFooter } from "./SidebarFooter";

interface ServerSidebarProps {
	connections: Connection[];
	selectedId: number | null;
	activeConnectionId: number | null;
	onSelect: (id: number) => void;
	onAdd: () => void;
	onDoubleClick: (id: number) => void;
	onViewAll: () => void;
	onDisconnect: () => void;
	onSettings: () => void;
}

function getInitials(name: string): string {
	const words = name.trim().split(/\s+/);
	if (words.length === 1) {
		return name.slice(0, 2).toUpperCase();
	}
	return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function getVisibleConnections(connections: Connection[], activeConnectionId: number | null): Connection[] {
	if (activeConnectionId == null) return [];
	return connections.filter((c) => c.id === activeConnectionId);
}

export function ServerSidebar({
	connections,
	selectedId,
	activeConnectionId,
	onSelect,
	onAdd,
	onDoubleClick,
	onViewAll,
	onDisconnect,
	onSettings,
}: ServerSidebarProps) {
	const { t } = useI18n();
	const [collapsed, setCollapsed] = useState(false);

	const visibleConnections = useMemo(
		() => getVisibleConnections(connections, activeConnectionId),
		[connections, activeConnectionId],
	);

	const isActive = useMemo(() => {
		const set = new Set<number>();
		if (activeConnectionId != null) set.add(activeConnectionId);
		return set;
	}, [activeConnectionId]);

	return (
		<nav
			className={`bg-surface-container-low border-r border-outline-variant flex flex-col py-3 gap-3 z-40 shrink-0 transition-all duration-300 ${collapsed ? "w-16 items-center" : "w-60 px-3"}`}
		>
			<BrandButton collapsed={collapsed} onViewAll={onViewAll} />

			<div className={`h-[2px] bg-outline-variant rounded-full ${collapsed ? "w-6" : "w-full"}`} />

			{/* Server List — active connections only */}
			<div className="flex flex-col gap-1 w-full flex-1 overflow-y-auto no-scrollbar">
				{visibleConnections.length === 0 && !collapsed && (
					<div className="text-muted-foreground text-xs text-center py-4">{t("connection.noActive")}</div>
				)}

				{visibleConnections.map((conn) => {
					const isSelected = conn.id === selectedId;
					const isConnActive = isActive.has(conn.id);
					return (
						<button
							key={conn.id}
							className={[
								"relative flex items-center gap-2 transition-all duration-300 text-xs font-semibold",
								collapsed ? "w-10 h-10 rounded-xl justify-center mx-auto" : "w-full px-3 py-2 rounded-lg justify-start",
								isSelected
									? collapsed
										? "bg-surface-container-highest"
										: "bg-primary/10 text-primary"
									: collapsed
										? "bg-surface-container-highest hover:bg-surface-container-high"
										: "text-muted-foreground hover:bg-surface-container-high hover:text-foreground",
								isConnActive && collapsed ? "ring-2 ring-primary" : "",
							].join(" ")}
							title={conn.name}
							onClick={() => {
								onSelect(conn.id);
							}}
							onDoubleClick={() => {
								onDoubleClick(conn.id);
							}}
						>
							{isSelected && collapsed && (
								<div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r-full" />
							)}
							{isSelected && !collapsed && (
								<div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
							)}
							<span className={collapsed ? "text-on-surface-variant" : "truncate text-left flex-1"}>
								{collapsed ? getInitials(conn.name) : conn.name}
							</span>
							{!collapsed && isConnActive && (
								<button
									className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
									title={t("connection.disconnect")}
									onClick={(e) => {
										e.stopPropagation();
										onDisconnect();
									}}
								>
									<Icon name="close" size={12} />
								</button>
							)}
						</button>
					);
				})}

				{/* Add button */}
				{!collapsed && (
					<button
						className="border border-dashed border-outline hover:border-primary hover:bg-surface-container transition-all duration-300 flex items-center justify-center gap-2 w-full py-2 rounded-lg text-on-surface-variant hover:text-primary shrink-0"
						title={t("connection.add")}
						onClick={onAdd}
					>
						<Icon name="add" size={16} />
						<span className="text-xs">{t("connection.add")}</span>
					</button>
				)}
				{collapsed && (
					<button
						className="border border-dashed border-outline hover:border-primary hover:bg-surface-container transition-all duration-300 flex items-center justify-center text-on-surface-variant hover:text-primary shrink-0 w-10 h-10 rounded-full mx-auto"
						title={t("connection.add")}
						onClick={onAdd}
					>
						<Icon name="add" size={16} />
					</button>
				)}
			</div>

			<SidebarFooter
				collapsed={collapsed}
				onToggleCollapse={() => {
					setCollapsed((v) => !v);
				}}
				onSettings={onSettings}
			/>
		</nav>
	);
}
