import { Terminal } from "@renderer/components/Terminal/Terminal";
import { useContextMenu } from "@renderer/hooks/useContextMenu";
import { useFileList } from "@renderer/hooks/useFileList";
import { useFileSelection } from "@renderer/hooks/useFileSelection";
import { useI18n } from "@renderer/hooks/useI18n";
import { useLocalDrives } from "@renderer/hooks/useLocalDrives";
import { usePaneNavigation } from "@renderer/hooks/usePaneNavigation";
import { useTerminalToggle } from "@renderer/hooks/useTerminalToggle";
import { useTypeAhead } from "@renderer/hooks/useTypeAhead";
import { matchesWildcard } from "@renderer/lib/utils";
import { getErrorI18nKey, type SftpErrorInfo } from "@shared/sftp-error";
import type { FileEntry } from "@shared/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ConnectionErrorView } from "./ConnectionErrorView";
import { FileContextMenu } from "./FileContextMenu";
import { FileList } from "./FileList";
import { Toolbar } from "./Toolbar";

interface FilePaneProps {
	type: "local" | "remote";
	connectionId: number;
	initialPath: string;
	connectionError?: SftpErrorInfo | null;
	onReconnect?: () => void;
	onPathChange?: (path: string) => void;
}

export function FilePane({
	type,
	connectionId,
	initialPath,
	connectionError,
	onReconnect,
	onPathChange,
}: FilePaneProps) {
	const { t } = useI18n();
	const paneRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	const [filter, setFilter] = useState("");

	const { selectedNames, handleSelectEntry, clearSelection } = useFileSelection();
	const {
		currentPath,
		navigateTo,
		handleNavigateUp: paneNavigateUp,
		handleEnterDirectory,
		handleGoBack: paneGoBack,
		handleGoForward: paneGoForward,
		handleMouseDown,
		canGoBack,
		canGoForward,
	} = usePaneNavigation(type, initialPath, clearSelection);
	const { drives, driveRoot, isWindows } = useLocalDrives(currentPath);
	const {
		visible: showTerminal,
		toggle: handleToggleTerminal,
		handleKeyDown: terminalHandleKeyDown,
	} = useTerminalToggle();
	const contextMenu = useContextMenu<FileEntry>();

	useEffect(() => {
		void window.api.filesystem.setLastPath(connectionId, type, currentPath);
	}, [currentPath, connectionId, type]);

	useEffect(() => {
		onPathChange?.(currentPath);
	}, [currentPath, onPathChange]);

	const { entries, loading, error, refresh } = useFileList(currentPath, {
		type,
		connectionId: type === "remote" ? connectionId : undefined,
	});

	const filteredEntries = useMemo(() => {
		if (!filter.trim()) return entries;
		return entries.filter((entry) => matchesWildcard(filter, entry.name));
	}, [entries, filter]);

	const {
		typeAheadName,
		handleKeyDown: typeAheadKeyDown,
		clearTypeAhead,
	} = useTypeAhead(filteredEntries, scrollContainerRef);

	useEffect(() => {
		clearTypeAhead();
	}, [filter, currentPath, clearTypeAhead]);

	const handleNavigateTo = useCallback(
		(path: string) => {
			clearSelection();
			navigateTo(path);
		},
		[clearSelection, navigateTo],
	);

	const handleNavigateUp = useCallback(() => {
		clearSelection();
		paneNavigateUp();
	}, [clearSelection, paneNavigateUp]);

	const handleEnterDirectoryWrapped = useCallback(
		(name: string) => {
			handleEnterDirectory(name);
		},
		[handleEnterDirectory],
	);

	const handleGoBackWrapped = useCallback(() => {
		clearSelection();
		paneGoBack();
	}, [clearSelection, paneGoBack]);

	const handleGoForwardWrapped = useCallback(() => {
		clearSelection();
		paneGoForward();
	}, [clearSelection, paneGoForward]);

	const handleRefresh = useCallback(() => {
		void refresh();
	}, [refresh]);

	const handleOpenFile = useCallback(
		(entry: FileEntry) => {
			void window.api.filesystem.openPath(entry.fullPath).catch(() => {
				toast.error(t("file.contextMenu.openError"));
			});
		},
		[t],
	);

	const handleContextMenuAction = useCallback(
		(actionId: string, entry: FileEntry) => {
			if (actionId === "open") {
				if (entry.isDirectory) {
					handleEnterDirectory(entry.name);
				} else {
					handleOpenFile(entry);
				}
			}
		},
		[handleEnterDirectory, handleOpenFile],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			typeAheadKeyDown(e);
			terminalHandleKeyDown(e);
		},
		[typeAheadKeyDown, terminalHandleKeyDown],
	);

	const listingError = error;
	const deadError = connectionError ?? (listingError?.code === "NOT_CONNECTED" ? listingError : null);
	const isConnectionDead = deadError != null;
	const displayError = deadError ?? error ?? null;
	const errorMessage = displayError ? t(getErrorI18nKey(displayError.code)) : null;

	const showDriveSelector = isWindows && type === "local" && drives.length > 1;

	const sessionId = `${type}-${String(connectionId)}`;

	return (
		<div
			ref={paneRef}
			tabIndex={-1}
			className="flex-1 flex flex-col overflow-hidden bg-surface-container-lowest border-r border-outline-variant min-w-0"
			onMouseDown={handleMouseDown}
			onKeyDown={handleKeyDown}
		>
			<Toolbar
				onGoBack={handleGoBackWrapped}
				onGoForward={handleGoForwardWrapped}
				canGoBack={canGoBack}
				canGoForward={canGoForward}
				onNavigateUp={handleNavigateUp}
				onRefresh={handleRefresh}
				onNavigateTo={handleNavigateTo}
				onToggleTerminal={handleToggleTerminal}
				terminalVisible={showTerminal}
				drives={showDriveSelector ? drives : []}
				currentPath={currentPath}
				isAtDriveRoot={driveRoot !== null}
				filter={filter}
				onFilterChange={setFilter}
			/>
			{isConnectionDead ? (
				<ConnectionErrorView technicalDetail={deadError.technicalDetail} onReconnect={onReconnect} />
			) : (
				<FileList
					entries={filteredEntries}
					loading={loading}
					error={errorMessage}
					errorDetail={displayError?.technicalDetail}
					onEnterDirectory={handleEnterDirectoryWrapped}
					onOpenFile={handleOpenFile}
					onSelectEntry={handleSelectEntry}
					selectedNames={selectedNames}
					typeAheadName={typeAheadName}
					scrollContainerRef={scrollContainerRef}
					onContextMenu={(e, entry) => {
						contextMenu.open(e, entry);
					}}
				/>
			)}
			{showTerminal && (
				<div className="h-48 shrink-0 border-t border-outline-variant">
					<Terminal sessionId={sessionId} type={type} connectionId={type === "remote" ? connectionId : undefined} />
				</div>
			)}
			{contextMenu.menu && (
				<FileContextMenu
					x={contextMenu.menu.x}
					y={contextMenu.menu.y}
					entry={contextMenu.menu.data}
					panelType={type}
					onClose={contextMenu.close}
					onAction={handleContextMenuAction}
				/>
			)}
		</div>
	);
}
