import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { useI18n } from "@renderer/hooks/useI18n";
import type { ActiveSession } from "@renderer/store/activeSessions";
import type { Connection } from "@shared/types";
import { useMemo, useState } from "react";

import { BrandButton } from "./BrandButton";
import { SidebarFooter } from "./SidebarFooter";

interface ServerSidebarProps {
	connections: Connection[];
	activeConnectionId: number | null;
	activeSessions: ActiveSession[];
	onSelect: (id: number) => void;
	onAdd: () => void;
	onDoubleClick: (id: number) => void;
	onViewAll: () => void;
	onDisconnect: (connectionId: number) => void;
	onSettings: () => void;
}

function getInitials(name: string): string {
	const words = name.trim().split(/\s+/);
	if (words.length === 1) {
		return name.slice(0, 2).toUpperCase();
	}
	return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function getVisibleConnections(connections: Connection[], activeSessions: ActiveSession[]): Connection[] {
	const activeIds = new Set(activeSessions.map((s) => s.connectionId));
	return connections.filter((c) => activeIds.has(c.id));
}

export function ServerSidebar({
	connections,
	activeConnectionId,
	activeSessions,
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
		() => getVisibleConnections(connections, activeSessions),
		[connections, activeSessions],
	);

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
					const isCurrentView = conn.id === activeConnectionId;
					return (
						<Button
							key={conn.id}
							variant={isCurrentView ? "selected" : "ghost"}
							size="default"
							className={`relative ${
								collapsed ? "w-10 h-10 rounded-xl mx-auto px-0" : "w-full px-3 py-2 rounded-lg justify-start"
							} text-xs font-semibold ${
								isCurrentView && collapsed
									? "ring-2 ring-primary"
									: !isCurrentView && collapsed
										? "opacity-50"
										: ""
							}`}
							title={conn.name}
							onClick={() => {
								onSelect(conn.id);
							}}
							onDoubleClick={() => {
								onDoubleClick(conn.id);
							}}
						>
							{isCurrentView && collapsed && (
								<span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r-full" />
							)}
							{isCurrentView && !collapsed && (
								<span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
							)}
							{!isCurrentView && !collapsed && (
								<span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-outline-variant rounded-r-full" />
							)}
							<span
								className={
									collapsed
										? isCurrentView
											? "text-on-surface-variant"
											: "text-muted-foreground"
										: "truncate text-left flex-1"
								}
							>
								{collapsed ? getInitials(conn.name) : conn.name}
							</span>
							{!collapsed && (
								<Button
									variant="ghost"
									size="icon-xs"
									className="ml-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
									aria-label={t("connection.disconnect")}
									title={t("connection.disconnect")}
									onClick={(e) => {
										e.stopPropagation();
										onDisconnect(conn.id);
									}}
								>
									<Icon name="close" size={12} />
								</Button>
							)}
						</Button>
					);
				})}

				{/* Add button */}
				{!collapsed && (
					<Button
						variant="outline"
						size="default"
						className="w-full py-2 border-dashed text-on-surface-variant hover:text-primary hover:border-primary justify-center"
						aria-label={t("connection.add")}
						title={t("connection.add")}
						onClick={onAdd}
					>
						<Icon name="add" size={16} />
						<span className="text-xs">{t("connection.add")}</span>
					</Button>
				)}
				{collapsed && (
					<Button
						variant="outline"
						size="icon"
						className="w-10 h-10 rounded-full border-dashed text-on-surface-variant hover:text-primary hover:border-primary mx-auto"
						aria-label={t("connection.add")}
						title={t("connection.add")}
						onClick={onAdd}
					>
						<Icon name="add" size={16} />
					</Button>
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
