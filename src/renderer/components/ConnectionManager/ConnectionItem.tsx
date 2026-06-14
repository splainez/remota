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
			{isSelected && <div className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />}
			<div
				className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
					isSelected ? "bg-primary/20" : `bg-surface-container-highest`
				}`}
			>
				<Icon
					name={protocolIcon(connection.protocol) as "terminal" | "send" | "cloud" | "server"}
					size={14}
					className={isSelected ? "text-primary" : "text-muted-foreground"}
				/>
			</div>
			<div className="min-w-0 flex-1">
				<div className="truncate text-sm font-medium">{connection.name}</div>
				<div className="truncate text-xs text-muted-foreground">
					{connection.username}@{connection.host}:{connection.port}
				</div>
			</div>
			<div className="flex shrink-0 items-center gap-1.5">
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
				{isActive && <span className="ml-1 size-2 shrink-0 rounded-full bg-primary" />}
			</div>
		</div>
	);
}
