import { useMemo, useState, useCallback } from "react";
import type { ReactElement } from "react";

export type SortKey = string;
export type SortDir = "asc" | "desc";

interface SortConfig {
	key: SortKey;
	direction: SortDir;
}

interface UseSortOptions<T> {
	items: T[];
	initialKey: SortKey;
	initialDir?: SortDir;
	compare: (a: T, b: T, key: SortKey) => number;
	partition?: (items: T[]) => { head: T[]; tail: T[] };
}

export function useSort<T>({
	items,
	initialKey,
	initialDir = "asc",
	compare,
	partition,
}: UseSortOptions<T>) {
	const [key, setKey] = useState<SortKey>(initialKey);
	const [dir, setDir] = useState<SortDir>(initialDir);

	const handleSort = useCallback(
		(newKey: SortKey) => {
			if (key === newKey) {
				setDir((d) => (d === "asc" ? "desc" : "asc"));
			} else {
				setKey(newKey);
				setDir("asc");
			}
		},
		[key],
	);

	const sorted = useMemo(() => {
		if (partition) {
			const { head, tail } = partition([...items]);
			const cmp = (a: T, b: T) => {
				const val = compare(a, b, key);
				return dir === "asc" ? val : -val;
			};
			return [...head.sort(cmp), ...tail.sort(cmp)];
		}

		return [...items].sort((a, b) => {
			const val = compare(a, b, key);
			return dir === "asc" ? val : -val;
		});
	}, [items, key, dir, compare, partition]);

	const config: SortConfig = { key, direction: dir };

	return { sorted, config, handleSort, setKey, setDir };
}

export function createSortIndicator(
	currentKey: SortKey,
	sortKey: SortKey,
	sortDir: SortDir,
	ascIcon: ReactElement,
	descIcon: ReactElement,
): ReactElement | null {
	if (currentKey !== sortKey) return null;
	return sortDir === "asc" ? ascIcon : descIcon;
}
