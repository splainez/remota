import { useState, useCallback, useEffect } from "react";

interface ContextMenuState {
	x: number;
	y: number;
}

export function useContextMenu<T = void>() {
	const [menu, setMenu] = useState<(ContextMenuState & { data: T }) | null>(null);

	const open = useCallback((e: React.MouseEvent, data: T) => {
		e.preventDefault();
		setMenu({ x: e.clientX, y: e.clientY, data });
	}, []);

	const close = useCallback(() => {
		setMenu(null);
	}, []);

	useEffect(() => {
		if (!menu) return;
		const handler = () => { close(); };
		document.addEventListener("click", handler);
		return () => { document.removeEventListener("click", handler); };
	}, [menu, close]);

	return { menu, open, close };
}
