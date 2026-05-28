import { useCallback, useEffect, useRef } from "react";
import { t } from "../../../i18n";
import { useFileList } from "../../hooks/useFileList";
import { useFileSelection } from "../../hooks/useFileSelection";
import { usePaneNavigation } from "../../hooks/usePaneNavigation";
import { useLocalDrives } from "../../hooks/useLocalDrives";
import { useTerminalToggle } from "../../hooks/useTerminalToggle";
import { useContextMenu } from "../../hooks/useContextMenu";
import type { FileEntry } from "../../../shared/types";
import { getErrorI18nKey, type SftpErrorInfo } from "../../../shared/sftp-error";
import { FileList } from "./FileList";
import { FileContextMenu } from "./FileContextMenu";
import { Toolbar } from "./Toolbar";
import { Terminal } from "../Terminal/Terminal";
import { ConnectionErrorView } from "./ConnectionErrorView";

interface FilePaneProps {
	type: "local" | "remote";
	connectionId: number;
	initialPath: string;
	connectionError?: SftpErrorInfo | null;
	onReconnect?: () => void;
	onPathChange?: (path: string) => void;
}

export function FilePane({ type, connectionId, initialPath, connectionError, onReconnect, onPathChange }: FilePaneProps) {
	const paneRef = useRef<HTMLDivElement>(null);

	const { selectedNames, handleSelectEntry, clearSelection } = useFileSelection();
	const { currentPath, navigateTo, handleNavigateUp: paneNavigateUp, handleEnterDirectory, handleGoBack: paneGoBack, handleGoForward: paneGoForward, handleMouseDown, canGoBack, canGoForward } = usePaneNavigation(type, initialPath, clearSelection);
	const { drives, driveRoot, isWindows } = useLocalDrives(currentPath);
	const { visible: showTerminal, toggle: handleToggleTerminal, handleKeyDown } = useTerminalToggle();
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
			/>
			{isConnectionDead ? (
				<ConnectionErrorView
					technicalDetail={deadError.technicalDetail}
					onReconnect={onReconnect}
				/>
		) : (
				<FileList
					entries={entries}
					loading={loading}
					error={errorMessage}
					errorDetail={displayError?.technicalDetail}
					onEnterDirectory={handleEnterDirectoryWrapped}
					onSelectEntry={handleSelectEntry}
					selectedNames={selectedNames}
					onContextMenu={(e, entry) => { contextMenu.open(e, entry); }}
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
				/>
			)}
		</div>
	);
}
