import { Terminal } from "@renderer/components/Terminal/Terminal";
import { useContextMenu } from "@renderer/hooks/useContextMenu";
import { useDelete } from "@renderer/hooks/useDelete";
import { useDownload } from "@renderer/hooks/useDownload";
import { useFileList } from "@renderer/hooks/useFileList";
import { useFileSelection } from "@renderer/hooks/useFileSelection";
import { useFileWatcher } from "@renderer/hooks/useFileWatcher";
import { useI18n } from "@renderer/hooks/useI18n";
import { useLocalDrives } from "@renderer/hooks/useLocalDrives";
import { usePaneNavigation } from "@renderer/hooks/usePaneNavigation";
import { useTerminalToggle } from "@renderer/hooks/useTerminalToggle";
import { useTypeAhead } from "@renderer/hooks/useTypeAhead";
import { useUpload } from "@renderer/hooks/useUpload";
import { matchesWildcard } from "@renderer/lib/utils";
import { useSettingsStore } from "@renderer/store/settings";
import { LoggerFactory } from "@shared/lib/logger";
import { classifyError, getErrorI18nKey, type SftpErrorInfo } from "@shared/sftp-error";
import type { FileEntry } from "@shared/types";
import { renameParamsSchema } from "@shared/validation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";

import { ConnectionErrorView } from "./ConnectionErrorView";
import { FileContextMenu } from "./FileContextMenu";
import { FileList } from "./FileList";
import { Toolbar } from "./Toolbar";

const logger = LoggerFactory.init({ name: "renderer.FilePane" });

interface FilePaneProps {
	type: "local" | "remote";
	connectionId: number;
	initialPath: string;
	protocol?: "sftp" | "scp" | "s3";
	connectionError?: SftpErrorInfo | null;
	remoteStatus?: "connecting" | "connected" | "error";
	initialShowTerminal?: boolean;
	peerLocalPath?: string;
	peerRemotePath?: string;
	onReconnect?: () => void;
	onPathChange?: (path: string) => void;
}

export function FilePane({
	type,
	connectionId,
	initialPath,
	protocol,
	connectionError,
	remoteStatus,
	initialShowTerminal = false,
	peerLocalPath,
	peerRemotePath,
	onReconnect,
	onPathChange,
}: FilePaneProps) {
	const { t } = useI18n();
	const paneRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	const [filter, setFilter] = useState("");
	const [editingName, setEditingName] = useState<string | null>(null);

	const { selectedNames, lastClickedName, handleSelectEntry, clearSelection } = useFileSelection();
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
	const { drives, currentDrive, isWindows } = useLocalDrives(currentPath);
	const {
		visible: showTerminal,
		toggle: handleToggleTerminal,
		handleKeyDown: terminalHandleKeyDown,
	} = useTerminalToggle(initialShowTerminal);
	const contextMenu = useContextMenu<FileEntry>();

	const download = useDownload({
		connectionId,
		localBasePath: peerLocalPath ?? currentPath,
		remoteBasePath: currentPath,
	});

	const upload = useUpload({
		connectionId,
		localBasePath: currentPath,
		remoteBasePath: peerRemotePath ?? "/",
	});

	useEffect(() => {
		void window.api.filesystem.setLastPath(connectionId, type, currentPath);
	}, [currentPath, connectionId, type]);

	useEffect(() => {
		onPathChange?.(currentPath);
	}, [currentPath, onPathChange]);

	const { entries, loading, error, refresh, refreshSilently } = useFileList(currentPath, {
		type,
		connectionId: type === "remote" ? connectionId : undefined,
	});

	const deleteOp = useDelete({
		panelType: type,
		connectionId,
		refresh,
	});

	useFileWatcher(currentPath, type, refreshSilently);

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

	useHotkeys(
		"f2",
		() => {
			if (!paneRef.current?.contains(document.activeElement)) return;
			const target = lastClickedName.current ?? selectedNames.at(-1);
			if (editingName === null && target != null) {
				setEditingName(target);
			}
		},
		{ enabled: editingName === null },
	);

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
		refresh().catch((error: unknown) => {
			logger.error("refresh failed", { error });
		});
	}, [refresh]);

	const handleOpenFile = useCallback(
		(entry: FileEntry) => {
			void window.api.filesystem.openPath(entry.fullPath).catch(() => {
				toast.error(t("file.contextMenu.openError"));
			});
		},
		[t],
	);

	const openInTerminal = useCallback(
		async (path: string) => {
			const { externalTerminal } = useSettingsStore.getState();

			if (!externalTerminal) {
				handleToggleTerminal();
				return;
			}

			try {
				await window.api.terminal.openExternal(connectionId, path, type);
				if (type === "remote" && (externalTerminal === "iterm2" || externalTerminal === "terminal-app")) {
					toast.info(t("terminal.externalOpenSshless"));
				}
			} catch {
				handleToggleTerminal();
				toast.error(t("terminal.externalOpenError"));
			}
		},
		[connectionId, type, handleToggleTerminal, t],
	);

	const handleOpenInTerminal = useCallback(
		(entry: FileEntry) => {
			const path = type === "remote" ? entry.fullPath : currentPath;
			return openInTerminal(path);
		},
		[openInTerminal, type, currentPath],
	);

	const handleToggleTerminalButton = useCallback(() => {
		return openInTerminal(currentPath);
	}, [openInTerminal, currentPath]);

	const handleContextMenuAction = useCallback(
		(actionId: string, entry: FileEntry) => {
			if (actionId === "open") {
				if (entry.isDirectory) {
					handleEnterDirectory(entry.name);
				} else {
					handleOpenFile(entry);
				}
			} else if (actionId === "openInTerminal") {
				handleOpenInTerminal(entry).catch((error: unknown) => {
					logger.error("openInTerminal failed", { error });
				});
			} else if (actionId === "download" && type === "remote") {
				const useSelection = selectedNames.length > 1 && selectedNames.includes(entry.name);
				const targets = useSelection ? filteredEntries.filter((e) => selectedNames.includes(e.name)) : [entry];
				download.startDownload(targets).catch((error: unknown) => {
					logger.error("download failed", { error });
				});
			} else if (actionId === "upload" && type === "local") {
				const useSelection = selectedNames.length > 1 && selectedNames.includes(entry.name);
				const targets = useSelection ? filteredEntries.filter((e) => selectedNames.includes(e.name)) : [entry];
				upload.startUpload(targets).catch((error: unknown) => {
					logger.error("upload failed", { error });
				});
			} else if (actionId === "copyPath") {
				navigator.clipboard
					.writeText(entry.fullPath)
					.then(() => {
						toast.success(t("file.contextMenu.pathCopied"));
					})
					.catch((error: unknown) => {
						logger.error("copyPath failed", { entry: entry.fullPath, error });
						toast.error(t("file.contextMenu.copyError"));
					});
			} else if (actionId === "copyName") {
				navigator.clipboard
					.writeText(entry.name)
					.then(() => {
						toast.success(t("file.contextMenu.nameCopied"));
					})
					.catch((error: unknown) => {
						logger.error("copyName failed", { entry: entry.name, error });
						toast.error(t("file.contextMenu.copyError"));
					});
			} else if (actionId === "rename") {
				setEditingName(entry.name);
			} else if (actionId === "delete") {
				const useSelection = selectedNames.length > 1 && selectedNames.includes(entry.name);
				const targets = useSelection ? filteredEntries.filter((e) => selectedNames.includes(e.name)) : [entry];
				deleteOp.startDelete(targets).catch((error: unknown) => {
					logger.error("delete failed", { error });
				});
			}
		},
		[
			deleteOp,
			download,
			upload,
			filteredEntries,
			handleEnterDirectory,
			handleOpenFile,
			handleOpenInTerminal,
			t,
			selectedNames,
			type,
		],
	);

	const handleRenameCommit = useCallback(
		async (entry: FileEntry, newName: string) => {
			const trimmed = newName.trim();
			if (trimmed.length === 0) {
				setEditingName(null);
				return;
			}
			if (trimmed === entry.name) {
				setEditingName(null);
				return;
			}
			const parsed = renameParamsSchema.safeParse({ oldPath: entry.fullPath, newName: trimmed });
			if (!parsed.success) {
				setEditingName(null);
				const messageKey = parsed.error.issues[0]?.message ?? "validation.default";
				toast.error(t(messageKey as Parameters<typeof t>[0]));
				return;
			}
			try {
				await window.api.filesystem.rename(parsed.data.oldPath, parsed.data.newName);
				setEditingName(null);
				clearSelection();
				refresh().catch((error: unknown) => {
					logger.error("refresh after rename failed", { error });
				});
			} catch (error: unknown) {
				setEditingName(null);
				const errorInfo = classifyError(error);
				logger.error("rename failed", { entry: entry.fullPath, newName: trimmed, error });
				toast.error(t(getErrorI18nKey(errorInfo.code)));
			}
		},
		[clearSelection, refresh, t],
	);

	const handleRenameCancel = useCallback(() => {
		setEditingName(null);
	}, []);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			typeAheadKeyDown(e);
			terminalHandleKeyDown(e);
		},
		[typeAheadKeyDown, terminalHandleKeyDown],
	);

	const listingError = error;
	const isStillConnecting = remoteStatus === "connecting";
	const deadError =
		connectionError ?? (!isStillConnecting && listingError?.code === "NOT_CONNECTED" ? listingError : null);
	const isConnectionDead = deadError != null;
	const displayError = deadError ?? error ?? null;
	const errorMessage = displayError ? t(getErrorI18nKey(displayError.code)) : null;

	const showDriveSelector = isWindows && type === "local" && drives.length > 0;

	const sessionId = `${type}-${String(connectionId)}`;

	return (
		<div
			ref={paneRef}
			tabIndex={-1}
			className="flex flex-col h-full overflow-hidden bg-surface-container-lowest min-w-0"
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
				onToggleTerminal={() => {
					handleToggleTerminalButton().catch((error: unknown) => {
						logger.error("toggle terminal failed", { error });
					});
				}}
				terminalVisible={showTerminal}
				drives={showDriveSelector ? drives : []}
				currentPath={currentPath}
				selectedDrive={currentDrive}
				filter={filter}
				onFilterChange={setFilter}
			/>
			{isConnectionDead ? (
				<ConnectionErrorView technicalDetail={deadError.technicalDetail} onReconnect={onReconnect} />
			) : remoteStatus === "connecting" ? (
				<div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
					{t("remote.connecting")}
				</div>
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
					editingName={editingName}
					onCommitRename={(entry, newName) => {
						void handleRenameCommit(entry, newName);
					}}
					onCancelRename={handleRenameCancel}
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
					protocol={protocol}
					onClose={contextMenu.close}
					onAction={handleContextMenuAction}
				/>
			)}
			{download.dialog}
			{upload.dialog}
			{deleteOp.dialog}
		</div>
	);
}
