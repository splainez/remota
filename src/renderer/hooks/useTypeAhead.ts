import { useCallback, useRef, useState } from "react";
import type { FileEntry } from "@shared/types";

const CYCLE_THRESHOLD_MS = 500;

export function useTypeAhead(entries: FileEntry[], scrollRef: React.RefObject<HTMLDivElement | null>) {
	const [typeAheadName, setTypeAheadName] = useState<string | null>(null);
	const lastKeyRef = useRef<string>("");
	const lastTimeRef = useRef<number>(0);
	const matchIndexRef = useRef<number>(0);

	const scrollIntoView = useCallback(
		(name: string) => {
			const container = scrollRef.current;
			if (!container) return;
			const row = container.querySelector(`[data-file-name="${CSS.escape(name)}"]`);
			if (row) {
				row.scrollIntoView({ block: "nearest" });
			}
		},
		[scrollRef],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			const target = e.target as HTMLElement | undefined;
			if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

			const key = e.key;

			if (key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return;
			if (/[\s]/.test(key)) return;

			const now = Date.now();
			const isRepeat =
				key.toLowerCase() === lastKeyRef.current.toLowerCase() && now - lastTimeRef.current < CYCLE_THRESHOLD_MS;
			lastKeyRef.current = key.toLowerCase();
			lastTimeRef.current = now;

			const matches = entries
				.filter((entry) => entry.name.toLowerCase().startsWith(key.toLowerCase()))
				.sort((a, b) => a.name.localeCompare(b.name));

			if (matches.length === 0) return;

			if (isRepeat) {
				matchIndexRef.current = (matchIndexRef.current + 1) % matches.length;
			} else {
				matchIndexRef.current = 0;
			}

			const matched = matches[matchIndexRef.current];
			setTypeAheadName(matched.name);
			scrollIntoView(matched.name);
		},
		[entries, scrollIntoView],
	);

	const clearTypeAhead = useCallback(() => {
		setTypeAheadName(null);
		lastKeyRef.current = "";
		lastTimeRef.current = 0;
		matchIndexRef.current = 0;
	}, []);

	return { typeAheadName, handleKeyDown, clearTypeAhead };
}
