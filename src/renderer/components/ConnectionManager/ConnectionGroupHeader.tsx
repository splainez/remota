import { Icon } from "@renderer/components/icons/Icon";

interface ConnectionGroupHeaderProps {
	name: string;
	count: number;
	collapsed: boolean;
	onToggle: () => void;
}

export function ConnectionGroupHeader({ name, count, collapsed, onToggle }: ConnectionGroupHeaderProps) {
	return (
		<button className="flex items-center gap-2 w-full text-left px-1 py-1.5 group" onClick={onToggle}>
			<Icon name={collapsed ? "triangle-down" : "folder-opened"} size={12} className="text-muted-foreground" />
			<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{name}</span>
			<span className="text-[10px] text-muted-foreground/60 ml-auto">{count}</span>
		</button>
	);
}
