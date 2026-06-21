/* eslint-disable react-refresh/only-export-components -- route config + component co-location is Tanstack Router convention */
import { ConnectionListView } from "@renderer/components/ConnectionManager/ConnectionListView";
import { useConnections } from "@renderer/hooks/useConnections";
import { useI18n } from "@renderer/hooks/useI18n";
import { useRecentConnections } from "@renderer/hooks/useRecentConnections";
import { useActiveSessionsStore } from "@renderer/store/activeSessions";
import { useSettingsStore } from "@renderer/store/settings";
import { LoggerFactory } from "@shared/lib/logger";
import { createRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

import { rootRoute } from "./__root";

const logger = LoggerFactory.init({ name: "renderer.routes.index" });

export const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: ConnectionsIndex,
});

function ConnectionsIndex() {
	const router = useRouter();
	const { t } = useI18n();
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
			void router.navigate({
				to: "/browse/$connectionId",
				params: { connectionId: String(conn.id) },
				search: { showTerminal: false },
			});
		}
	};

	const handleOpenTerminal = async (id: number) => {
		const conn = connections.find((c) => c.id === id);
		if (!conn) return;

		const { externalTerminal } = useSettingsStore.getState();

		useActiveSessionsStore.getState().addSession(conn.id);

		if (externalTerminal) {
			try {
				await window.api.terminal.openExternal(conn.id, undefined, "remote");
			} catch (error) {
				logger.error("Failed to open external terminal", { id: conn.id, error });
				toast.error(t("terminal.externalOpenError"));
				void router.navigate({
					to: "/browse/$connectionId",
					params: { connectionId: String(conn.id) },
					search: { showTerminal: true },
				});
			}
		} else {
			void router.navigate({
				to: "/browse/$connectionId",
				params: { connectionId: String(conn.id) },
				search: { showTerminal: true },
			});
		}
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
				void handleOpenTerminal(id);
			}}
			onDelete={(id) => {
				handleDelete(id).catch((error: unknown) => {
					logger.error("handleDelete failed", { id, error });
				});
			}}
		/>
	);
}
