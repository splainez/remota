import type { Connection, NewConnection, ConnectionUpdate } from "@shared/types";
import { useCallback, useEffect, useState } from "react";

export function useConnections() {
	const [connections, setConnections] = useState<Connection[]>([]);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);

	const loadConnections = useCallback(async () => {
		const list = await window.api.connections.list();
		setConnections(list);
		setLoading(false);
	}, []);

	useEffect(() => {
		void loadConnections();
	}, [loadConnections]);

	const selected = connections.find((c) => c.id === selectedId) ?? null;

	const select = useCallback((id: number | null) => {
		setSelectedId(id);
	}, []);

	const create = useCallback(
		async (data: NewConnection) => {
			const created = await window.api.connections.create(data);
			await loadConnections();
			setSelectedId(created.id);
			return created;
		},
		[loadConnections],
	);

	const update = useCallback(
		async (data: ConnectionUpdate) => {
			await window.api.connections.update(data);
			await loadConnections();
		},
		[loadConnections],
	);

	const remove = useCallback(
		async (id: number) => {
			await window.api.connections.delete(id);
			if (selectedId === id) setSelectedId(null);
			await loadConnections();
		},
		[loadConnections, selectedId],
	);

	return {
		connections,
		selected,
		selectedId,
		loading,
		select,
		create,
		update,
		remove,
	};
}
