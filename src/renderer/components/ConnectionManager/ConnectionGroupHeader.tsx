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
			className="h-auto w-full justify-start gap-2 px-1 py-1.5 text-muted-foreground"
			onClick={onToggle}
		>
			<Icon name={collapsed ? "triangle-down" : "folder-opened"} size={12} />
			<span className="text-[11px] font-semibold tracking-wider uppercase">{name}</span>
			<span className="ml-auto text-[10px] text-muted-foreground/60">{count}</span>
		</Button>
	);
}
