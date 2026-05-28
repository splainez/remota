import { t } from "../../../i18n";
import { Icon } from "../icons/Icon";
import { useAppNavigation } from "../../store/appNavigation";

interface ConnectionContextMenuProps {
	x: number;
	y: number;
	connectionId: number;
	onClose: () => void;
	onConnect: (id: number) => void;
	onDelete: (id: number) => void;
}

export function ConnectionContextMenu({ x, y, connectionId, onClose, onConnect, onDelete }: ConnectionContextMenuProps) {
	const { openConnectionForm } = useAppNavigation();

	return (
		<div
			className="fixed z-50 bg-popover border border-outline-variant rounded-lg shadow-lg overflow-hidden py-1 min-w-[140px]"
			style={{ left: x, top: y }}
			onClick={(e) => { e.stopPropagation(); }}
		>
			<button
				className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-surface-container-high transition-colors text-popover-foreground"
				onClick={() => { openConnectionForm("edit", connectionId); onClose(); }}
			>
				<Icon name="edit" size={14} />
				{t("connection.edit")}
			</button>
			<button
				className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-surface-container-high transition-colors text-popover-foreground"
				onClick={() => { onConnect(connectionId); onClose(); }}
			>
				<Icon name="play" size={14} />
				{t("connection.connect")}
			</button>
			<div className="h-px bg-outline-variant my-1" />
			<button
				className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-destructive/10 transition-colors text-destructive"
				onClick={() => { onDelete(connectionId); onClose(); }}
			>
				<Icon name="trash" size={14} />
				{t("connection.delete")}
			</button>
		</div>
	);
}
