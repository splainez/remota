import { getSelectedConnection, useConnectionsStore } from "@renderer/store/connections";
import { LoggerFactory } from "@shared/lib/logger";
import type { NewConnection, ConnectionUpdate } from "@shared/types";
import { useCallback, useEffect } from "react";

const logger = LoggerFactory.init({ name: "renderer.useConnections" });

export function useConnections() {
	const connections = useConnectionsStore((s) => s.connections);
	const selectedId = useConnectionsStore((s) => s.selectedId);
	const loading = useConnectionsStore((s) => s.loading);
	const selected = useConnectionsStore(getSelectedConnection);

	useEffect(() => {
		useConnectionsStore
			.getState()
			.load()
			.catch((error: unknown) => {
				logger.error("loadConnections failed", { error });
			});
	}, []);

	const select = useCallback((id: number | null) => {
		useConnectionsStore.getState().select(id);
	}, []);

	const create = useCallback(async (data: NewConnection) => {
		const created = await useConnectionsStore.getState().create(data);
		return created;
	}, []);

	const update = useCallback(async (data: ConnectionUpdate) => {
		await useConnectionsStore.getState().update(data);
	}, []);

	const remove = useCallback(async (id: number) => {
		await useConnectionsStore.getState().remove(id);
	}, []);

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
