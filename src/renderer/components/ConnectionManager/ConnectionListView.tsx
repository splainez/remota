import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { useConnectionFilters } from "@renderer/hooks/useConnectionFilters";
import { useContextMenu } from "@renderer/hooks/useContextMenu";
import { useI18n } from "@renderer/hooks/useI18n";
import type { Connection } from "@shared/types";
import { useMemo, useState, useCallback } from "react";

import { ConnectionContextMenu } from "./ConnectionContextMenu";
import { ConnectionGroupHeader } from "./ConnectionGroupHeader";
import { ConnectionItem } from "./ConnectionItem";

interface ConnectionListViewProps {
	connections: Connection[];
	recentConnections: Connection[];
	selectedId: number | null;
	activeConnectionId: number | null;
	onSelect: (id: number) => void;
	onAdd: () => void;
	onDoubleClick: (id: number) => void;
	onOpen: (id: number) => void;
	onOpenTerminal: (id: number) => void;
	onDelete: (id: number) => void;
}

export function ConnectionListView({
	connections,
	recentConnections,
	selectedId,
	activeConnectionId,
	onSelect,
	onAdd,
	onDoubleClick,
	onOpen,
	onOpenTerminal,
	onDelete,
}: ConnectionListViewProps) {
	const { t } = useI18n();
	const { search, setSearch, collapsedGroups, groups, toggleGroup, filtered } = useConnectionFilters(connections);
	const { menu, open, close } = useContextMenu<number>();
	const [recentCollapsed, setRecentCollapsed] = useState(false);

	const activeSet = useMemo(() => {
		const set = new Set<number>();
		if (activeConnectionId != null) set.add(activeConnectionId);
		return set;
	}, [activeConnectionId]);

	const hasRecent = recentConnections.length > 0;
	const showRecent = hasRecent && !search.trim();

	const toggleRecent = useCallback(() => {
		setRecentCollapsed((prev) => !prev);
	}, []);

	return (
		<div className="flex flex-1 flex-col overflow-auto bg-surface" onClick={close}>
			<div className="shrink-0 border-b border-outline-variant bg-surface-container-low px-6 py-4">
				<div className="mb-3 flex items-center justify-between">
					<h1 className="text-lg font-semibold text-on-surface">{t("connection.manager")}</h1>
					<Button variant="default" size="sm" onClick={onAdd}>
						<Icon name="add" size={14} />
						{t("connection.add")}
					</Button>
				</div>
				<div className="relative">
					<Icon name="search" size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						placeholder={t("file.filter")}
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
						}}
						className="
							w-full rounded-lg border border-outline-variant bg-surface py-2 pr-3 pl-9 text-sm text-on-surface
							transition-all
							placeholder:text-muted-foreground
							focus:border-primary focus:ring-2 focus:ring-primary/40 focus:outline-none
						"
					/>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto px-6 py-4">
				{filtered.length === 0 && !showRecent && (
					<div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
						<Icon name="server" size={48} className="mb-3 opacity-40" />
						<div className="mb-1 text-base">{t("connection.noSelection")}</div>
						<div className="text-xs">{t("connection.add")}</div>
					</div>
				)}

				{showRecent && (
					<div className="mb-4">
						<ConnectionGroupHeader
							name={t("connection.recent")}
							count={recentConnections.length}
							collapsed={recentCollapsed}
							onToggle={toggleRecent}
						/>

						{!recentCollapsed && (
							<div className="ml-1 flex flex-col gap-0.5">
								{recentConnections.map((conn) => (
									<ConnectionItem
										key={`recent-${String(conn.id)}`}
										connection={conn}
										isSelected={conn.id === selectedId}
										isActive={activeSet.has(conn.id)}
										onClick={() => {
											onSelect(conn.id);
										}}
										onDoubleClick={() => {
											onDoubleClick(conn.id);
										}}
										onContextMenu={(e) => {
											open(e, conn.id);
										}}
										onOpen={() => {
											onOpen(conn.id);
										}}
										onOpenTerminal={() => {
											onOpenTerminal(conn.id);
										}}
									/>
								))}
							</div>
						)}
					</div>
				)}

				{groups.map(([groupName, conns]) => (
					<div key={groupName} className="mb-4">
						<ConnectionGroupHeader
							name={groupName}
							count={conns.length}
							collapsed={collapsedGroups.has(groupName)}
							onToggle={() => {
								toggleGroup(groupName);
							}}
						/>

						{!collapsedGroups.has(groupName) && (
							<div className="ml-1 flex flex-col gap-0.5">
								{conns.map((conn) => (
									<ConnectionItem
										key={conn.id}
										connection={conn}
										isSelected={conn.id === selectedId}
										isActive={activeSet.has(conn.id)}
										onClick={() => {
											onSelect(conn.id);
										}}
										onDoubleClick={() => {
											onDoubleClick(conn.id);
										}}
										onContextMenu={(e) => {
											open(e, conn.id);
										}}
										onOpen={() => {
											onOpen(conn.id);
										}}
										onOpenTerminal={() => {
											onOpenTerminal(conn.id);
										}}
									/>
								))}
							</div>
						)}
					</div>
				))}
			</div>

			{menu && (
				<ConnectionContextMenu
					x={menu.x}
					y={menu.y}
					connectionId={menu.data}
					onClose={close}
					onConnect={onDoubleClick}
					onDelete={onDelete}
				/>
			)}
		</div>
	);
}
