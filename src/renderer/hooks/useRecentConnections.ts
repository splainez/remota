import { LoggerFactory } from "@shared/lib/logger";
import type { Connection } from "@shared/types";
import { useCallback, useEffect, useState } from "react";

const logger = LoggerFactory.init({ name: "renderer.useRecentConnections" });

export function useRecentConnections(connections: Connection[]) {
	const [recentIds, setRecentIds] = useState<number[]>([]);

	const loadRecent = useCallback(async () => {
		const ids = await window.api.connections.getRecent();
		setRecentIds(ids);
	}, []);

	useEffect(() => {
		loadRecent().catch((error: unknown) => {
			logger.error("loadRecent failed", { error });
		});
	}, [loadRecent]);

	useEffect(() => {
		loadRecent().catch((error: unknown) => {
			logger.error("loadRecent failed after connections change", { error });
		});
	}, [connections, loadRecent]);

	const recentConnections = recentIds
		.map((id) => connections.find((c) => c.id === id))
		.filter((c): c is Connection => c != null);

	return { recentConnections, recentIds, reload: loadRecent };
}
