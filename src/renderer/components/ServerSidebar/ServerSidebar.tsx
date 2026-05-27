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
		<nav className="w-20 bg-surface-container-low border-r border-outline-variant flex flex-col items-center py-4 gap-4 z-40 shrink-0">
			{/* Brand/Home */}
			<button
				className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center hover:rounded-xl transition-all duration-300 ease-in-out shadow-sm"
				title={t("app.title")}
				onClick={() => {
					/* Reset to connection manager */}}
			>
				<Icon name="server" size={24} />
			</button>

			<div className="w-8 h-[2px] bg-outline-variant rounded-full" />

			{/* Server List */}
			<div className="flex flex-col gap-3 w-full items-center flex-1 overflow-y-auto no-scrollbar">
				{connections.map((conn) => {
					const isSelected = conn.id === selectedId;
					const isConnActive = isActive.has(conn.id);
					return (
						<button
							key={conn.id}
							className={[
								"relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
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
								<div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
							)}
							<span className="font-label-md text-label-md text-on-surface-variant group-hover:text-primary">
								{getInitials(conn.name)}
							</span>
						</button>
					);
				})}

				<button
					className="w-12 h-12 rounded-full border border-dashed border-outline hover:border-primary hover:bg-surface-container transition-all duration-300 flex items-center justify-center text-on-surface-variant hover:text-primary"
					title={t("connection.add")}
					onClick={onAdd}
				>
					<Icon name="add" size={20} />
				</button>
			</div>

			{/* Footer Actions */}
			<div className="flex flex-col gap-3 w-full items-center mt-auto pt-4 border-t border-outline-variant">
				<button className="w-12 h-12 rounded-full hover:bg-surface-container hover:rounded-2xl transition-all duration-300 flex items-center justify-center text-on-surface-variant hover:text-primary">
					<Icon name="settings" size={20} />
				</button>
				<div className="w-12 h-12 rounded-full overflow-hidden hover:rounded-2xl transition-all duration-300 ring-2 ring-transparent hover:ring-primary flex items-center justify-center bg-surface-container-highest">
					<Icon name="person" size={20} className="text-on-surface-variant" />
				</div>
			</div>
		</nav>
	);
}
