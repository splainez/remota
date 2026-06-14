/* eslint-disable react-refresh/only-export-components -- route config + component co-location is Tanstack Router convention */
import { ConnectionListView } from "@renderer/components/ConnectionManager/ConnectionListView";
import { useConnections } from "@renderer/hooks/useConnections";
import { useRecentConnections } from "@renderer/hooks/useRecentConnections";
import { useActiveSessionsStore } from "@renderer/store/activeSessions";
import { LoggerFactory } from "@shared/lib/logger";
import { createRoute, useRouter } from "@tanstack/react-router";

import { rootRoute } from "./__root";

const logger = LoggerFactory.init({ name: "renderer.routes.index" });

export const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: ConnectionsIndex,
});

function ConnectionsIndex() {
	const router = useRouter();
	const { connections, selected, select, remove } = useConnections();
	const { recentConnections } = useRecentConnections(connections);

	const handleSelect = (id: number) => {
		select(id);
		void router.navigate({ to: `/connections/${String(id)}` });
	};

	const handleAdd = () => {
		select(null);
		void router.navigate({ to: "/connections/new" });
	};

	const handleOpenFileBrowser = (id: number) => {
		const conn = connections.find((c) => c.id === id);
		if (conn) {
			useActiveSessionsStore.getState().addSession(conn.id);
			void router.navigate({ to: "/browse/$connectionId", params: { connectionId: String(conn.id) } });
		}
	};

	const handleOpenTerminal = (id: number) => {
		const conn = connections.find((c) => c.id === id);
		if (!conn) return;

		void router.navigate({ to: "/browse/$connectionId", params: { connectionId: String(conn.id) } });
	};

	const handleDelete = async (id: number) => {
		await remove(id);
	};

	return (
		<ConnectionListView
			connections={connections}
			recentConnections={recentConnections}
			selectedId={selected?.id ?? null}
			activeConnectionId={null}
			onSelect={handleSelect}
			onAdd={handleAdd}
			onDoubleClick={handleOpenFileBrowser}
			onOpen={handleOpenFileBrowser}
			onOpenTerminal={(id) => {
				handleOpenTerminal(id);
			}}
			onDelete={(id) => {
				handleDelete(id).catch((error: unknown) => {
					logger.error("handleDelete failed", { id, error });
				});
			}}
		/>
	);
}
