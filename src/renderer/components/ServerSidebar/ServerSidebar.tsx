import { useMemo } from "react";
import { t } from "../../../i18n";
import type { Connection } from "../../../shared/types";
import { Icon } from "../icons/Icon";

interface ServerSidebarProps {
	connections: Connection[];
	selectedId: number | null;
	activeConnectionId: number | null;
	onSelect: (id: number) => void;
	onAdd: () => void;
	onDoubleClick: (id: number) => void;
}

function getInitials(name: string): string {
	const words = name.trim().split(/\s+/);
	if (words.length === 1) {
		return name.slice(0, 2).toUpperCase();
	}
	return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function ServerSidebar({
	connections,
	selectedId,
	activeConnectionId,
	onSelect,
	onAdd,
	onDoubleClick,
}: ServerSidebarProps) {
	const isActive = useMemo(() => {
		const set = new Set<number>();
		if (activeConnectionId != null) set.add(activeConnectionId);
		return set;
	}, [activeConnectionId]);

	return (
		<nav className="w-16 bg-surface-container-low border-r border-outline-variant flex flex-col items-center py-3 gap-3 z-40 shrink-0">
			{/* Brand/Home */}
			<button
				className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:rounded-lg transition-all duration-300 ease-in-out shadow-sm"
				title={t("app.title")}
				onClick={() => {
					/* Reset to connection manager */}}
			>
				<Icon name="server" size={20} />
			</button>

			<div className="w-6 h-[2px] bg-outline-variant rounded-full" />

			{/* Server List */}
			<div className="flex flex-col gap-2 w-full items-center flex-1 overflow-y-auto no-scrollbar">
				{connections.map((conn) => {
					const isSelected = conn.id === selectedId;
					const isConnActive = isActive.has(conn.id);
					return (
						<button
							key={conn.id}
							className={[
								"relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 text-xs font-semibold",
								isSelected
									? "bg-surface-container-highest"
									: "bg-surface-container-highest hover:bg-surface-container-high",
								isConnActive ? "ring-2 ring-primary" : "",
							].join(" ")}
							title={conn.name}
							onClick={() => { onSelect(conn.id); }}
							onDoubleClick={() => { onDoubleClick(conn.id); }}
						>
							{isSelected && (
								<div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r-full" />
							)}
							<span className="text-on-surface-variant">
								{getInitials(conn.name)}
							</span>
						</button>
					);
				})}

				<button
					className="w-10 h-10 rounded-full border border-dashed border-outline hover:border-primary hover:bg-surface-container transition-all duration-300 flex items-center justify-center text-on-surface-variant hover:text-primary"
					title={t("connection.add")}
					onClick={onAdd}
				>
					<Icon name="add" size={16} />
				</button>
			</div>

			{/* Footer Actions */}
			<div className="flex flex-col gap-2 w-full items-center mt-auto pt-3 border-t border-outline-variant">
				<button className="w-10 h-10 rounded-full hover:bg-surface-container hover:rounded-xl transition-all duration-300 flex items-center justify-center text-on-surface-variant hover:text-primary">
					<Icon name="settings" size={16} />
				</button>
				<div className="w-10 h-10 rounded-full overflow-hidden hover:rounded-xl transition-all duration-300 ring-2 ring-transparent hover:ring-primary flex items-center justify-center bg-surface-container-highest">
					<Icon name="person" size={16} className="text-on-surface-variant" />
				</div>
			</div>
		</nav>
	);
}
