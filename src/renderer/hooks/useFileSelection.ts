import { useState, useCallback, useRef } from "react";

export function useFileSelection() {
	const [selectedNames, setSelectedNames] = useState<string[]>([]);
	const lastClickedNameRef = useRef<string | null>(null);

	const handleSelectEntry = useCallback((name: string, ctrlKey: boolean, shiftKey: boolean, sortedNames: string[]) => {
		if (shiftKey) {
			const anchor = lastClickedNameRef.current ?? sortedNames[0];
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
	}, []);

	const clearSelection = useCallback(() => {
		setSelectedNames([]);
		lastClickedNameRef.current = null;
	}, []);

	return { selectedNames, lastClickedName: lastClickedNameRef, handleSelectEntry, clearSelection };
}
