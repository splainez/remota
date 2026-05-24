import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../../../i18n";
import { usePlatformStore } from "../../store/platform";
import { useNavigationStore } from "../../store/navigation";
import { join, parentPath } from "../../shared/path-utils";
import { useFileList } from "../../hooks/useFileList";
import { Breadcrumb } from "./Breadcrumb";
import { FileList } from "./FileList";
import { Toolbar } from "./Toolbar";

interface FilePaneProps {
	type: "local" | "remote";
	connectionId: number;
	initialPath: string;
	isMocked: boolean;
}

export function FilePane({ type, connectionId, initialPath, isMocked }: FilePaneProps) {
	const [currentPath, setCurrentPath] = useState(initialPath);
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
		if (!isMocked && type === "local" && isWindows) {
			void window.api.filesystem.listDrives().then(setDrives);
		}
	}, [isMocked, type, isWindows]);

	useEffect(() => {
		if (pathInitialized.current) {
			void window.api.filesystem.setLastPath(connectionId, type, currentPath);
		}
	}, [currentPath, connectionId, type]);

	const { entries, loading, error, refresh } = useFileList(currentPath, isMocked);

	const navigateTo = useCallback(
		(path: string) => {
			push(type, path);
			setCurrentPath(path);
		},
		[push, type],
	);

	const handleNavigate = useCallback(
		(path: string) => {
			navigateTo(path);
		},
		[navigateTo],
	);

	const handleNavigateUp = useCallback(() => {
		const newPath = parentPath(currentPath);
		if (newPath !== null) {
			navigateTo(newPath);
		}
	}, [currentPath, navigateTo]);

	const handleNavigateTo = useCallback(
		(path: string) => {
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

	const handleGoBack = useCallback(() => {
		const path = goBack(type);
		if (path !== null) {
			setCurrentPath(path);
		}
	}, [goBack, type]);

	const handleGoForward = useCallback(() => {
		const path = goForward(type);
		if (path !== null) {
			setCurrentPath(path);
		}
	}, [goForward, type]);

	const handleRefresh = useCallback(() => {
		void refresh();
	}, [refresh]);

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
	const showDriveSelector = isWindows && !isMocked && type === "local" && drives.length > 1;

	return (
		<div
			className="flex-1 flex flex-col overflow-hidden bg-gray-100 border border-gray-300 rounded-md min-w-0"
			onMouseDown={handleMouseDown}
		>
			{isMocked && (
				<div className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold text-center shrink-0">
					{t("file.mockBanner")}
				</div>
			)}
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
			<FileList
				entries={entries}
				loading={loading}
				error={error}
				onEnterDirectory={handleEnterDirectory}
			/>
			{!isMocked && (
				<div className="h-[22px] flex items-center px-2 bg-gray-200 border-t border-gray-300 text-xs text-gray-500 shrink-0">
					{loading ? t("file.loading") : `${String(entries.length)} ${t("file.items")}`}
				</div>
			)}
		</div>
	);
}
