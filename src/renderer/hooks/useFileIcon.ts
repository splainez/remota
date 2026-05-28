import { useEffect, useState } from "react";

const MAX_CACHE_SIZE = 500;
const iconCache = new Map<string, string>();

function setCache(key: string, value: string) {
	if (iconCache.size >= MAX_CACHE_SIZE) {
		const first = iconCache.keys().next().value;
		if (first !== undefined) iconCache.delete(first);
	}
	iconCache.set(key, value);
}

export function useFileIcon(filePath?: string): { icon: string | null } {
	const [icon, setIcon] = useState<string | null>(filePath ? (iconCache.get(filePath) ?? null) : null);

	useEffect(() => {
		if (!filePath || iconCache.has(filePath)) return;

		let cancelled = false;

		void window.api.filesystem.getIcon(filePath).then((dataUrl) => {
			if (cancelled || !dataUrl) return;
			setCache(filePath, dataUrl);
			setIcon(dataUrl);
		});

		return () => {
			cancelled = true;
		};
	}, [filePath]);

	return { icon };
}
