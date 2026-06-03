import { useState, useCallback, useEffect } from "react";
import { useNavigationStore } from "@renderer/store/navigation";
import { join, parentPath } from "@renderer/shared/path-utils";

export function usePaneNavigation(type: "local" | "remote", initialPath: string, onBeforeNavigate?: () => void) {
	const [currentPath, setCurrentPath] = useState(initialPath);
	const push = useNavigationStore((s) => s.push);
	const goBack = useNavigationStore((s) => s.goBack);
	const goForward = useNavigationStore((s) => s.goForward);
	const clearHistory = useNavigationStore((s) => s.clear);
	const canGoBack = useNavigationStore((s) => s.canGoBack(type));
	const canGoForward = useNavigationStore((s) => s.canGoForward(type));
	const navigateTo = useCallback(
		(path: string) => {
			push(type, path);
			setCurrentPath(path);
		},
		[push, type],
	);

	const handleNavigateUp = useCallback(() => {
		const newPath = parentPath(currentPath);
		if (newPath !== null) {
			navigateTo(newPath);
		}
	}, [currentPath, navigateTo]);

	const handleEnterDirectory = useCallback(
		(name: string) => {
			navigateTo(join(currentPath, name));
		},
		[currentPath, navigateTo],
	);

	const handleGoBack = useCallback(() => {
		onBeforeNavigate?.();
		const path = goBack(type);
		if (path !== null) {
			setCurrentPath(path);
		}
	}, [goBack, type, onBeforeNavigate]);

	const handleGoForward = useCallback(() => {
		onBeforeNavigate?.();
		const path = goForward(type);
		if (path !== null) {
			setCurrentPath(path);
		}
	}, [goForward, type, onBeforeNavigate]);

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

	useEffect(() => {
		push(type, initialPath);
		setCurrentPath(initialPath);
	}, [type, initialPath, push]);

	return {
		currentPath,
		setCurrentPath,
		navigateTo,
		handleNavigateUp,
		handleEnterDirectory,
		handleGoBack,
		handleGoForward,
		handleMouseDown,
		canGoBack,
		canGoForward,
		clearHistory: () => {
			clearHistory(type);
		},
	};
}
