import { useMemo, useState } from "react";
import { t } from "../../../i18n";
import type { Connection } from "../../../shared/types";
import { Icon } from "../icons/Icon";
import { useAppNavigation } from "../../store/appNavigation";

interface ConnectionListViewProps {
	connections: Connection[];
	selectedId: number | null;
	activeConnectionId: number | null;
	onSelect: (id: number) => void;
	onAdd: () => void;
	onDoubleClick: (id: number) => void;
	onDelete: (id: number) => void;
}

function protocolIcon(protocol: string): string {
	switch (protocol) {
		case "sftp": return "terminal";
		case "scp": return "send";
		case "s3": return "cloud";
		default: return "server";
	}
}

function groupConnections(connections: Connection[]): Map<string, Connection[]> {
	const map = new Map<string, Connection[]>();
	for (const conn of connections) {
		const group = conn.groupName.trim() || t("connection.uncategorized");
		const list = map.get(group) ?? [];
		list.push(conn);
		map.set(group, list);
	}
	return map;
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
	const [search, setSearch] = useState("");
	const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
	const [contextMenu, setContextMenu] = useState<{ x: number; y: number; connectionId: number } | null>(null);
	const { openConnectionForm } = useAppNavigation();

	const filtered = useMemo(() => {
		if (!search.trim()) return connections;
		const q = search.toLowerCase();
		return connections.filter(
			(c) =>
				c.name.toLowerCase().includes(q) ||
				c.host.toLowerCase().includes(q) ||
				c.username.toLowerCase().includes(q),
		);
	}, [connections, search]);

	const grouped = useMemo(() => groupConnections(filtered), [filtered]);
	const groups = useMemo(() => Array.from(grouped.entries()), [grouped]);

	const activeSet = useMemo(() => {
		const set = new Set<number>();
		if (activeConnectionId != null) set.add(activeConnectionId);
		return set;
	}, [activeConnectionId]);

	const toggleGroup = (group: string) => {
		setCollapsedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(group)) {
				next.delete(group);
			} else {
				next.add(group);
			}
			return next;
		});
	};

	const handleContextMenu = (e: React.MouseEvent, connectionId: number) => {
		e.preventDefault();
		setContextMenu({ x: e.clientX, y: e.clientY, connectionId });
	};

	const handleCloseContextMenu = () => {
		setContextMenu(null);
	};

	const handleEdit = (id: number) => {
		setContextMenu(null);
		openConnectionForm("edit", id);
	};

	const handleDeleteFromMenu = (id: number) => {
		setContextMenu(null);
		onDelete(id);
	};

	return (
		<div className="flex-1 flex flex-col bg-surface overflow-auto" onClick={handleCloseContextMenu}>
			{/* Header */}
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
						onChange={(e) => { setSearch(e.target.value); }}
						className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface border border-outline-variant text-sm text-on-surface placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
					/>
				</div>
			</div>

			{/* Connection list */}
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
						<button
							className="flex items-center gap-2 w-full text-left px-1 py-1.5 group"
							onClick={() => { toggleGroup(groupName); }}
						>
							<Icon
								name={collapsedGroups.has(groupName) ? "triangle-down" : "folder-opened"}
								size={12}
								className="text-muted-foreground"
							/>
							<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
								{groupName}
							</span>
							<span className="text-[10px] text-muted-foreground/60 ml-auto">{conns.length}</span>
						</button>

						{!collapsedGroups.has(groupName) && (
							<div className="flex flex-col gap-0.5 ml-1">
								{conns.map((conn) => {
									const isSelected = conn.id === selectedId;
									const isConnActive = activeSet.has(conn.id);
									return (
										<button
											key={conn.id}
											className={[
												"relative flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all duration-150 group/item",
												isSelected
													? "bg-primary/10 text-primary"
													: "text-on-surface hover:bg-surface-container-high",
											].join(" ")}
											onClick={() => { onSelect(conn.id); }}
											onDoubleClick={() => { onDoubleClick(conn.id); }}
											onContextMenu={(e) => { handleContextMenu(e, conn.id); }}
										>
											{isSelected && (
												<div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
											)}
											<div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-primary/20" : "bg-surface-container-highest"}`}>
												<Icon
													name={protocolIcon(conn.protocol) as "terminal" | "send" | "cloud" | "server"}
													size={14}
													className={isSelected ? "text-primary" : "text-muted-foreground"}
												/>
											</div>
											<div className="flex-1 min-w-0">
												<div className="text-sm font-medium truncate">{conn.name}</div>
												<div className="text-xs text-muted-foreground truncate">
													{conn.username}@{conn.host}:{conn.port}
												</div>
											</div>
											{isConnActive && (
												<span className="w-2 h-2 rounded-full bg-primary shrink-0" title="Activa" />
											)}
										</button>
									);
								})}
							</div>
						)}
					</div>
				))}
			</div>

			{/* Context menu */}
			{contextMenu && (
				<div
					className="fixed z-50 bg-popover border border-outline-variant rounded-lg shadow-lg overflow-hidden py-1 min-w-[140px]"
					style={{ left: contextMenu.x, top: contextMenu.y }}
					onClick={(e) => { e.stopPropagation(); }}
				>
					<button
						className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-surface-container-high transition-colors text-popover-foreground"
						onClick={() => { handleEdit(contextMenu.connectionId); }}
					>
						<Icon name="edit" size={14} />
						{t("connection.edit")}
					</button>
					<button
						className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-surface-container-high transition-colors text-popover-foreground"
						onClick={() => { onDoubleClick(contextMenu.connectionId); setContextMenu(null); }}
					>
						<Icon name="play" size={14} />
						{t("connection.connect")}
					</button>
					<div className="h-px bg-outline-variant my-1" />
					<button
						className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-destructive/10 transition-colors text-destructive"
						onClick={() => { handleDeleteFromMenu(contextMenu.connectionId); }}
					>
						<Icon name="trash" size={14} />
						{t("connection.delete")}
					</button>
				</div>
			)}
		</div>
	);
}
