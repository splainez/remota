import type { Connection } from "@shared/types";
import { Icon } from "@renderer/components/icons/Icon";

function protocolIcon(protocol: string): string {
	switch (protocol) {
		case "sftp":
			return "terminal";
		case "scp":
			return "send";
		case "s3":
			return "cloud";
		default:
			return "server";
	}
}

interface ConnectionItemProps {
	connection: Connection;
	isSelected: boolean;
	isActive: boolean;
	onClick: () => void;
	onDoubleClick: () => void;
	onContextMenu: (e: React.MouseEvent) => void;
}

export function ConnectionItem({
	connection,
	isSelected,
	isActive,
	onClick,
	onDoubleClick,
	onContextMenu,
}: ConnectionItemProps) {
	return (
		<button
			className={[
				"relative flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all duration-150 group/item",
				isSelected ? "bg-primary/10 text-primary" : "text-on-surface hover:bg-surface-container-high",
			].join(" ")}
			onClick={onClick}
			onDoubleClick={onDoubleClick}
			onContextMenu={onContextMenu}
		>
			{isSelected && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />}
			<div
				className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-primary/20" : "bg-surface-container-highest"}`}
			>
				<Icon
					name={protocolIcon(connection.protocol) as "terminal" | "send" | "cloud" | "server"}
					size={14}
					className={isSelected ? "text-primary" : "text-muted-foreground"}
				/>
			</div>
			<div className="flex-1 min-w-0">
				<div className="text-sm font-medium truncate">{connection.name}</div>
				<div className="text-xs text-muted-foreground truncate">
					{connection.username}@{connection.host}:{connection.port}
				</div>
			</div>
			{isActive && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
		</button>
	);
}
