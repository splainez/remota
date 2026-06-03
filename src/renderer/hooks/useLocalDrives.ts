import { usePlatformStore } from "@renderer/store/platform";
import { useEffect, useMemo, useState } from "react";

export function useLocalDrives(currentPath: string) {
	const isWindows = usePlatformStore((s) => s.isWindows);
	const [drives, setDrives] = useState<string[]>([]);

	useEffect(() => {
		if (isWindows) {
			void window.api.filesystem.listDrives().then(setDrives);
		}
	}, [isWindows]);

	const driveRoot = useMemo(() => {
		if (!isWindows) return null;
		return drives.find((d) => d === currentPath) ?? null;
	}, [isWindows, drives, currentPath]);

	return { drives, driveRoot, isWindows };
}
