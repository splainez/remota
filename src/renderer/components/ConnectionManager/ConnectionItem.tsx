import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { useI18n } from "@renderer/hooks/useI18n";
import { connectionSupportsTerminal } from "@shared/lib/connection";
import type { Connection } from "@shared/types";

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
	onOpen?: () => void;
	onOpenTerminal?: () => void;
}

export function ConnectionItem({
	connection,
	isSelected,
	isActive,
	onClick,
	onDoubleClick,
	onContextMenu,
	onOpen,
	onOpenTerminal,
}: ConnectionItemProps) {
	const { t } = useI18n();
	const isTerminalDisabled = !connectionSupportsTerminal(connection);

	const handleRowKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onClick();
		}
	};

	const stopRowMouse = (e: React.MouseEvent) => {
		e.stopPropagation();
	};

	const stopRowKey = (e: React.KeyboardEvent) => {
		e.stopPropagation();
	};

	return (
		<div
			role="button"
			tabIndex={0}
			className={[
				"relative flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all duration-150 group/item cursor-pointer",
				isSelected ? "bg-primary/10 text-primary" : "text-on-surface hover:bg-surface-container-high",
			].join(" ")}
			onClick={onClick}
			onDoubleClick={onDoubleClick}
			onContextMenu={onContextMenu}
			onKeyDown={handleRowKeyDown}
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
			<div className="flex items-center gap-1.5 shrink-0">
				{onOpen && (
					<Button
						variant="primary"
						size="sm"
						aria-label={t("connection.open")}
						title={t("connection.open")}
						onClick={(e) => {
							stopRowMouse(e);
							onOpen();
						}}
						onDoubleClick={stopRowMouse}
						onContextMenu={stopRowMouse}
						onKeyDown={stopRowKey}
					>
						<Icon name="folder-opened" />
						{t("connection.open")}
					</Button>
				)}
				{onOpenTerminal && (
					<Button
						variant="primary"
						size="sm"
						aria-label={t(isTerminalDisabled ? "connection.terminalDisabledS3" : "connection.openTerminal")}
						title={t(isTerminalDisabled ? "connection.terminalDisabledS3" : "connection.openTerminal")}
						disabled={isTerminalDisabled}
						onClick={(e) => {
							stopRowMouse(e);
							if (!isTerminalDisabled) onOpenTerminal();
						}}
						onDoubleClick={stopRowMouse}
						onContextMenu={stopRowMouse}
						onKeyDown={stopRowKey}
					>
						<Icon name="terminal" />
						{t(isTerminalDisabled ? "connection.terminalDisabledS3" : "connection.openTerminal")}
					</Button>
				)}
				{isActive && <span className="w-2 h-2 rounded-full bg-primary shrink-0 ml-1" />}
			</div>
		</div>
	);
}
