import { Icon, type IconName } from "@renderer/components/icons/Icon";
import { useI18n } from "@renderer/hooks/useI18n";
import type { FileEntry } from "@shared/types";
import React, { useEffect, useRef, useCallback } from "react";

interface MenuItem {
	id: string;
	icon: IconName;
	label: string;
	visible: boolean;
	variant?: "default" | "destructive";
	separator?: boolean;
}

interface FileContextMenuProps {
	x: number;
	y: number;
	entry: FileEntry;
	panelType: "local" | "remote";
	protocol?: "sftp" | "scp" | "s3";
	onClose: () => void;
	onAction?: (actionId: string, entry: FileEntry) => void;
}

function clampToViewport(x: number, y: number, menuWidth: number, menuHeight: number): { left: number; top: number } {
	const viewportW = window.innerWidth;
	const viewportH = window.innerHeight;
	return {
		left: Math.max(8, Math.min(x, viewportW - menuWidth - 8)),
		top: Math.max(8, Math.min(y, viewportH - menuHeight - 8)),
	};
}

export function FileContextMenu({ x, y, entry, panelType, protocol, onClose, onAction }: FileContextMenuProps) {
	const { t } = useI18n();
	const itemsRef = useRef<HTMLButtonElement[]>([]);
	const focusIndex = useRef(0);

	const handleAction = useCallback(
		(actionId: string) => {
			onAction?.(actionId, entry);
			onClose();
		},
		[onAction, entry, onClose],
	);

	const showTerminal = entry.isDirectory && (panelType === "local" || protocol !== "s3");
	const showRename = panelType === "local" || protocol !== "s3";
	const showEdit = panelType === "remote" && !entry.isDirectory;

	const menuItems: MenuItem[] = [
		{
			id: "open",
			icon: "link-external",
			label: t("file.contextMenu.open"),
			visible: true,
		},
		{
			id: "edit",
			icon: "edit",
			label: t("file.contextMenu.edit"),
			visible: showEdit,
		},
		{
			id: panelType === "local" ? "upload" : "download",
			icon: panelType === "local" ? "arrow-up" : "arrow-down",
			label: panelType === "local" ? t("file.contextMenu.upload") : t("file.contextMenu.download"),
			visible: true,
		},
		{
			id: "rename",
			icon: "text-cursor-input",
			label: t("file.contextMenu.rename"),
			visible: showRename,
		},
		{
			id: "delete",
			icon: "trash",
			label: t("file.contextMenu.delete"),
			visible: true,
			variant: "destructive",
		},
		{
			id: "copyPath",
			icon: "copy",
			label: t("file.contextMenu.copyPath"),
			visible: true,
			separator: true,
		},
		{
			id: "copyName",
			icon: "copy",
			label: t("file.contextMenu.copyName"),
			visible: true,
		},
		{
			id: "openInTerminal",
			icon: "terminal",
			label: t("file.contextMenu.openInTerminal"),
			visible: showTerminal,
		},
	];

	const visibleItems = menuItems.filter((item) => item.visible);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
				return;
			}
			if (e.key === "ArrowDown") {
				e.preventDefault();
				focusIndex.current = (focusIndex.current + 1) % visibleItems.length;
				itemsRef.current[focusIndex.current]?.focus();
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				focusIndex.current = (focusIndex.current - 1 + visibleItems.length) % visibleItems.length;
				itemsRef.current[focusIndex.current]?.focus();
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [onClose, visibleItems.length]);

	const position = clampToViewport(x, y, 200, visibleItems.length * 36 + 8);

	useEffect(() => {
		itemsRef.current[0]?.focus();
	}, []);

	return (
		<div
			className="fixed z-50 bg-popover border border-outline-variant rounded-lg shadow-lg overflow-hidden py-1 min-w-[180px]"
			style={{ left: position.left, top: position.top }}
			onClick={(e) => {
				e.stopPropagation();
			}}
			role="menu"
		>
			{visibleItems.map((item, index) => (
				<React.Fragment key={item.id}>
					{item.separator && <div className="h-px bg-outline-variant my-1" />}
					<button
						ref={(el) => {
							if (el) itemsRef.current[index] = el;
						}}
						className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
							item.variant === "destructive"
								? "hover:bg-destructive/10 text-destructive"
								: "hover:bg-surface-container-high text-popover-foreground"
						}`}
						role="menuitem"
						onClick={() => {
							handleAction(item.id);
						}}
					>
						<Icon name={item.icon} size={14} />
						{item.label}
					</button>
				</React.Fragment>
			))}
		</div>
	);
}
