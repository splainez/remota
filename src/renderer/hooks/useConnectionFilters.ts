import { useMemo, useState, useCallback } from "react";
import type { Connection } from "../../shared/types";
import { t } from "../../i18n";

export function groupConnections(connections: Connection[]): Map<string, Connection[]> {
	const map = new Map<string, Connection[]>();
	for (const conn of connections) {
		const group = conn.groupName.trim() || t("connection.uncategorized");
		const list = map.get(group) ?? [];
		list.push(conn);
		map.set(group, list);
	}
	return map;
}

export function useConnectionFilters(connections: Connection[]) {
	const [search, setSearch] = useState("");
	const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

	const filtered = useMemo(() => {
		if (!search.trim()) return connections;
		const q = search.toLowerCase();
		return connections.filter(
			(c) =>
				c.name.toLowerCase().includes(q) ||
				c.host.toLowerCase().includes(q) ||
				c.username.toLowerCase().includes(q),
		);
	}, [connections, search]);

	const grouped = useMemo(() => groupConnections(filtered), [filtered]);
	const groups = useMemo(() => Array.from(grouped.entries()), [grouped]);

	const toggleGroup = useCallback((group: string) => {
		setCollapsedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(group)) {
				next.delete(group);
			} else {
				next.add(group);
			}
			return next;
		});
	}, []);

	return { search, setSearch, collapsedGroups, groups, toggleGroup, filtered };
}
