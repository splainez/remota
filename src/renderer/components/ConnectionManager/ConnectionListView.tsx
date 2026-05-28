import { useMemo } from "react";
import { t } from "../../../i18n";
import type { Connection } from "../../../shared/types";
import { Icon } from "../icons/Icon";
import { useContextMenu } from "../../hooks/useContextMenu";
import { useConnectionFilters } from "../../hooks/useConnectionFilters";
import { ConnectionContextMenu } from "./ConnectionContextMenu";
import { ConnectionGroupHeader } from "./ConnectionGroupHeader";
import { ConnectionItem } from "./ConnectionItem";

interface ConnectionListViewProps {
	connections: Connection[];
	selectedId: number | null;
	activeConnectionId: number | null;
	onSelect: (id: number) => void;
	onAdd: () => void;
	onDoubleClick: (id: number) => void;
	onDelete: (id: number) => void;
}

export function ConnectionListView({
	connections,
	selectedId,
	activeConnectionId,
	onSelect,
	onAdd,
	onDoubleClick,
	onDelete,
}: ConnectionListViewProps) {
	const { search, setSearch, collapsedGroups, groups, toggleGroup, filtered } = useConnectionFilters(connections);
	const { menu, open, close } = useContextMenu<number>();

	const activeSet = useMemo(() => {
		const set = new Set<number>();
		if (activeConnectionId != null) set.add(activeConnectionId);
		return set;
	}, [activeConnectionId]);

	return (
		<div className="flex-1 flex flex-col bg-surface overflow-auto" onClick={close}>
			<div className="shrink-0 border-b border-outline-variant bg-surface-container-low px-6 py-4">
				<div className="flex items-center justify-between mb-3">
					<h1 className="text-lg font-semibold text-on-surface">{t("connection.manager")}</h1>
					<button
						className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity"
						onClick={onAdd}
					>
						<Icon name="add" size={14} />
						<span>{t("connection.add")}</span>
					</button>
				</div>
				<div className="relative">
					<Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						placeholder={t("file.filter")}
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
						}}
						className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface border border-outline-variant text-sm text-on-surface placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
					/>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto px-6 py-4">
				{filtered.length === 0 && (
					<div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
						<Icon name="server" size={48} className="mb-3 opacity-40" />
						<div className="text-base mb-1">{t("connection.noSelection")}</div>
						<div className="text-xs">{t("connection.add")}</div>
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
							<div className="flex flex-col gap-0.5 ml-1">
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
