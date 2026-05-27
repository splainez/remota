import { useMemo, useState, useRef, useEffect } from "react";
import { t } from "../../../i18n";
import type { Connection } from "../../../shared/types";
import { Icon } from "../icons/Icon";
import { useTheme } from "../../hooks/useTheme";

interface ServerSidebarProps {
	connections: Connection[];
	selectedId: number | null;
	activeConnectionId: number | null;
	onSelect: (id: number) => void;
	onAdd: () => void;
	onDoubleClick: (id: number) => void;
	onViewAll: () => void;
}

function getInitials(name: string): string {
	const words = name.trim().split(/\s+/);
	if (words.length === 1) {
		return name.slice(0, 2).toUpperCase();
	}
	return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function getVisibleConnections(
	connections: Connection[],
	activeConnectionId: number | null,
): Connection[] {
	if (activeConnectionId == null) return [];
	return connections.filter((c) => c.id === activeConnectionId);
}

function ThemeSelect() {
	const { theme, setTheme } = useTheme();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => { document.removeEventListener("mousedown", handleClick); };
	}, []);

	const options: { value: "dark" | "light" | "system"; label: string }[] = [
		{ value: "dark", label: t("theme.dark") },
		{ value: "light", label: t("theme.light") },
		{ value: "system", label: t("theme.system") },
	];

	return (
		<div ref={ref} className="relative">
			<button
				className="w-10 h-10 rounded-full hover:bg-surface-container hover:rounded-xl transition-all duration-300 flex items-center justify-center text-on-surface-variant hover:text-primary"
				title={t("theme.change")}
				onClick={() => { setOpen((v) => !v); }}
			>
				<Icon name="layout" size={16} />
			</button>
			{open && (
				<div className="absolute bottom-full left-0 mb-1 w-36 bg-popover border border-outline-variant rounded-lg shadow-lg overflow-hidden z-50">
					{options.map((opt) => (
						<button
							key={opt.value}
							className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-surface-container-high transition-colors ${theme === opt.value ? "text-primary bg-primary/10" : "text-popover-foreground"}`}
							onClick={() => { setTheme(opt.value); setOpen(false); }}
						>
							<span className={`w-2 h-2 rounded-full ${theme === opt.value ? "bg-primary" : "bg-transparent border border-outline-variant"}`} />
							{opt.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

export function ServerSidebar({
	connections,
	selectedId,
	activeConnectionId,
	onSelect,
	onAdd,
	onDoubleClick,
	onViewAll,
}: ServerSidebarProps) {
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
			{/* Brand/Home */}
			<div className={`flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
				<button
					className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:rounded-lg transition-all duration-300 ease-in-out shadow-sm shrink-0"
					title={t("app.title")}
					onClick={onViewAll}
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
								collapsed
									? "w-10 h-10 rounded-xl justify-center mx-auto"
									: "w-full px-3 py-2 rounded-lg justify-start",
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
							onClick={() => { onSelect(conn.id); }}
							onDoubleClick={() => { onDoubleClick(conn.id); }}
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
								<span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
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

			{/* Footer Actions */}
			<div className={`flex flex-col gap-2 w-full mt-auto pt-3 border-t border-outline-variant ${collapsed ? "items-center" : ""}`}>
				<button
					className={`w-10 h-10 rounded-full hover:bg-surface-container hover:rounded-xl transition-all duration-300 flex items-center justify-center text-on-surface-variant hover:text-primary ${collapsed ? "" : "self-start"}`}
					title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
					onClick={() => { setCollapsed((v) => !v); }}
				>
					<Icon name={collapsed ? "arrow-right" : "arrow-left"} size={16} />
				</button>
				<div className={`flex items-center gap-2 ${collapsed ? "flex-col" : "flex-row"}`}>
					<ThemeSelect />
					{!collapsed && (
						<button className="w-10 h-10 rounded-full hover:bg-surface-container hover:rounded-xl transition-all duration-300 flex items-center justify-center text-on-surface-variant hover:text-primary">
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
		</nav>
	);
}
