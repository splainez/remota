import { MenuItem, MenuItemSeparator } from "@renderer/components/ui/menu-item";
import { useI18n } from "@renderer/hooks/useI18n";
import { useAppNavigation } from "@renderer/store/appNavigation";

interface ConnectionContextMenuProps {
	x: number;
	y: number;
	connectionId: number;
	onClose: () => void;
	onConnect: (id: number) => void;
	onDelete: (id: number) => void;
}

export function ConnectionContextMenu({
	x,
	y,
	connectionId,
	onClose,
	onConnect,
	onDelete,
}: ConnectionContextMenuProps) {
	const { t } = useI18n();
	const { openConnectionForm } = useAppNavigation();

	return (
		<div
			className="fixed z-50 bg-popover border border-outline-variant rounded-lg shadow-lg overflow-hidden py-1 min-w-[140px]"
			style={{ left: x, top: y }}
			onClick={(e) => {
				e.stopPropagation();
			}}
			role="menu"
		>
			<MenuItem
				icon="edit"
				onClick={() => {
					openConnectionForm("edit", connectionId);
					onClose();
				}}
			>
				{t("connection.edit")}
			</MenuItem>
			<MenuItem
				icon="play"
				onClick={() => {
					onConnect(connectionId);
					onClose();
				}}
			>
				{t("connection.connect")}
			</MenuItem>
			<MenuItemSeparator />
			<MenuItem
				icon="trash"
				variant="destructive"
				onClick={() => {
					onDelete(connectionId);
					onClose();
				}}
			>
				{t("connection.delete")}
			</MenuItem>
		</div>
	);
}
