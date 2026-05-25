import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../../../i18n";
import { usePlatformStore } from "../../store/platform";
import { useNavigationStore } from "../../store/navigation";
import { join, parentPath } from "../../shared/path-utils";
import { useFileList } from "../../hooks/useFileList";
import { getErrorI18nKey, type SftpErrorInfo } from "../../../shared/sftp-error";
import { Breadcrumb } from "./Breadcrumb";
import { FileList } from "./FileList";
import { Toolbar } from "./Toolbar";

interface FilePaneProps {
	type: "local" | "remote";
	connectionId: number;
	initialPath: string;
	connectionError?: SftpErrorInfo | null;
	onReconnect?: () => void;
}

export function FilePane({ type, connectionId, initialPath, connectionError, onReconnect }: FilePaneProps) {
	const [currentPath, setCurrentPath] = useState(initialPath);
	const [selectedNames, setSelectedNames] = useState<string[]>([]);
	const lastClickedNameRef = useRef<string | null>(null);
	const [drives, setDrives] = useState<string[]>([]);
	const prevConnectionRef = useRef(connectionId);
	const pathInitialized = useRef(false);
	const isWindows = usePlatformStore((s) => s.isWindows);

	const push = useNavigationStore((s) => s.push);
	const goBack = useNavigationStore((s) => s.goBack);
	const goForward = useNavigationStore((s) => s.goForward);
	const clearHistory = useNavigationStore((s) => s.clear);
	const canGoBack = useNavigationStore((s) => s.canGoBack(type));
	const canGoForward = useNavigationStore((s) => s.canGoForward(type));

	useEffect(() => {
		const connectionChanged = prevConnectionRef.current !== connectionId;
		prevConnectionRef.current = connectionId;

		if (connectionChanged || !pathInitialized.current) {
			clearHistory(type);
		}

		push(type, initialPath);
		setCurrentPath(initialPath);
		pathInitialized.current = true;
	}, [type, connectionId, initialPath]);

	useEffect(() => {
		if (type === "local" && isWindows) {
			void window.api.filesystem.listDrives().then(setDrives);
		}
	}, [type, isWindows]);

	useEffect(() => {
		if (pathInitialized.current) {
			void window.api.filesystem.setLastPath(connectionId, type, currentPath);
		}
	}, [currentPath, connectionId, type]);

	const { entries, loading, error, refresh } = useFileList(currentPath, {
		type,
		connectionId: type === "remote" ? connectionId : undefined,
	});

	const navigateTo = useCallback(
		(path: string) => {
			push(type, path);
			setCurrentPath(path);
		},
		[push, type],
	);

	const handleNavigate = useCallback(
		(path: string) => {
			setSelectedNames([]);
			lastClickedNameRef.current = null;
			navigateTo(path);
		},
		[navigateTo],
	);

	const handleNavigateUp = useCallback(() => {
		const newPath = parentPath(currentPath);
		if (newPath !== null) {
			setSelectedNames([]);
			lastClickedNameRef.current = null;
			navigateTo(newPath);
		}
	}, [currentPath, navigateTo]);

	const handleNavigateTo = useCallback(
		(path: string) => {
			setSelectedNames([]);
			lastClickedNameRef.current = null;
			navigateTo(path);
		},
		[navigateTo],
	);

	const handleEnterDirectory = useCallback(
		(name: string) => {
			navigateTo(join(currentPath, name));
		},
		[currentPath, navigateTo],
	);

	const handleSelectEntry = useCallback(
		(name: string, ctrlKey: boolean, shiftKey: boolean, sortedNames: string[]) => {
			if (shiftKey) {
				const anchor = lastClickedNameRef.current ?? sortedNames[0] ?? name;
				const anchorIdx = sortedNames.indexOf(anchor);
				const clickedIdx = sortedNames.indexOf(name);
				if (anchorIdx === -1 || clickedIdx === -1) {
					setSelectedNames([name]);
					lastClickedNameRef.current = name;
				} else {
					const start = Math.min(anchorIdx, clickedIdx);
					const end = Math.max(anchorIdx, clickedIdx);
					setSelectedNames(sortedNames.slice(start, end + 1));
				}
			} else if (ctrlKey) {
				setSelectedNames((prev) => {
					const idx = prev.indexOf(name);
					if (idx === -1) {
						return [...prev, name];
					}
					return prev.filter((n) => n !== name);
				});
				lastClickedNameRef.current = name;
			} else {
				setSelectedNames([name]);
				lastClickedNameRef.current = name;
			}
		},
		[],
	);

	const handleGoBack = useCallback(() => {
		const path = goBack(type);
		if (path !== null) {
			setSelectedNames([]);
			lastClickedNameRef.current = null;
			setCurrentPath(path);
		}
	}, [goBack, type]);

	const handleGoForward = useCallback(() => {
		const path = goForward(type);
		if (path !== null) {
			setSelectedNames([]);
			lastClickedNameRef.current = null;
			setCurrentPath(path);
		}
	}, [goForward, type]);

	const handleRefresh = useCallback(() => {
		void refresh();
	}, [refresh]);

	const listingError = error;
	const deadError = connectionError ?? (listingError?.code === "NOT_CONNECTED" ? listingError : null);
	const isConnectionDead = deadError != null;
	const displayError = deadError ?? listingError ?? null;
	const errorMessage = displayError ? t(getErrorI18nKey(displayError.code)) : null;

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			if (e.button === 3) {
				e.preventDefault();
				handleGoBack();
			} else if (e.button === 4) {
				e.preventDefault();
				handleGoForward();
			}
		},
		[handleGoBack, handleGoForward],
	);

	const driveRoot = isWindows
		? drives.find((d) => d === currentPath) ?? null
		: null;
	const showDriveSelector = isWindows && type === "local" && drives.length > 1;

	return (
		<div
			className="flex-1 flex flex-col overflow-hidden bg-gray-100 border border-gray-300 rounded-md min-w-0"
			onMouseDown={handleMouseDown}
		>
			<Toolbar
				onGoBack={handleGoBack}
				onGoForward={handleGoForward}
				canGoBack={canGoBack}
				canGoForward={canGoForward}
				onNavigateUp={handleNavigateUp}
				onRefresh={handleRefresh}
				onNavigateTo={handleNavigateTo}
				drives={showDriveSelector ? drives : []}
				currentPath={currentPath}
				isAtDriveRoot={driveRoot !== null}
			/>
			<Breadcrumb path={currentPath} onNavigate={handleNavigate} />
			{isConnectionDead ? (
				<div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-gray-600">
					<span className="text-sm font-semibold">{t("remote.connectionLost")}</span>
					{onReconnect && (
						<button
							className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 cursor-pointer"
							onClick={onReconnect}
						>
							{t("remote.reconnect")}
						</button>
					)}
					<pre className="text-xs text-gray-400 bg-gray-100 p-2 rounded mt-1 max-w-full overflow-auto whitespace-pre-wrap break-all">
						{deadError.technicalDetail}
					</pre>
				</div>
			) : (
				<FileList
					entries={entries}
					loading={loading}
					error={errorMessage}
					errorDetail={displayError?.technicalDetail}
					onEnterDirectory={handleEnterDirectory}
					onSelectEntry={handleSelectEntry}
					selectedNames={selectedNames}
				/>
			)}
			<div className="h-[22px] flex items-center px-2 bg-gray-200 border-t border-gray-300 text-xs text-gray-500 shrink-0">
				{loading ? t("file.loading") : `${String(entries.length)} ${t("file.items")}`}
			</div>
		</div>
	);
}
