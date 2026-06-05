import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";

interface ConnectionGroupHeaderProps {
	name: string;
	count: number;
	collapsed: boolean;
	onToggle: () => void;
}

export function ConnectionGroupHeader({ name, count, collapsed, onToggle }: ConnectionGroupHeaderProps) {
	return (
		<Button
			variant="ghost"
			size="sm"
			className="w-full justify-start h-auto py-1.5 px-1 gap-2 text-muted-foreground"
			onClick={onToggle}
		>
			<Icon name={collapsed ? "triangle-down" : "folder-opened"} size={12} />
			<span className="text-[11px] font-semibold uppercase tracking-wider">{name}</span>
			<span className="text-[10px] text-muted-foreground/60 ml-auto">{count}</span>
		</Button>
	);
}
