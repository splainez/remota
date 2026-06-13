import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
} from "@renderer/components/ui/sidebar";
import { useI18n } from "@renderer/hooks/useI18n";
import { useSidebar } from "@renderer/hooks/useSidbar";
import { cn } from "@renderer/lib/utils";
import type { ActiveSession } from "@renderer/store/activeSessions";
import type { Connection } from "@shared/types";
import { useMemo } from "react";

import { BrandButton } from "./BrandButton";
import { ServerSidebarFooter } from "./SidebarFooter";

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
	const { state } = useSidebar();
	const collapsed = state === "collapsed";

	const visibleConnections = useMemo(
		() => getVisibleConnections(connections, activeSessions),
		[connections, activeSessions],
	);

	return (
		<Sidebar
			collapsible="icon"
		>
			<SidebarHeader className="border-b border-sidebar-border">
				<BrandButton onViewAll={onViewAll} />
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu className="gap-1">
							{visibleConnections.length === 0 && !collapsed && (
								<div className="text-muted-foreground text-xs text-center py-4">{t("connection.noActive")}</div>
							)}

							{visibleConnections.map((conn) => {
								const isCurrentView = conn.id === activeConnectionId;
								return (
									<SidebarMenuItem key={conn.id}>
										<SidebarMenuButton
											isActive={isCurrentView}
											tooltip={conn.name}
											onClick={() => {
												onSelect(conn.id);
											}}
											onDoubleClick={() => {
												onDoubleClick(conn.id);
											}}
										>
											<span
												className={cn(
													"flex size-8 items-center justify-center rounded-lg text-xs font-semibold shrink-0",
													isCurrentView
														? "bg-sidebar-primary/10 text-sidebar-primary"
														: "bg-sidebar-accent text-muted-foreground",
												)}
											>
												{getInitials(conn.name)}
											</span>
											{!collapsed && <span className="flex-1 truncate text-left">{conn.name}</span>}
										</SidebarMenuButton>
										{!collapsed && (
											<Button
												variant="ghost"
												size="icon-xs"
												className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
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
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenuItem>
							{collapsed ? (
								<Button
									variant="outline"
									size="icon"
									className="size-8 rounded-lg border-dashed text-on-surface-variant hover:text-primary hover:border-primary"
									aria-label={t("connection.add")}
									title={t("connection.add")}
									onClick={onAdd}
								>
									<Icon name="add" size={16} />
								</Button>
							) : (
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
						</SidebarMenuItem>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="border-t border-sidebar-border">
				<ServerSidebarFooter onSettings={onSettings} />
			</SidebarFooter>
		</Sidebar>
	);
}
