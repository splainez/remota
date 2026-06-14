/* eslint-disable react-refresh/only-export-components -- route config + component co-location is Tanstack Router convention */
import { ConnectionForm } from "@renderer/components/ConnectionManager/ConnectionForm";
import { useConnections } from "@renderer/hooks/useConnections";
import type { Connection, NewConnection } from "@shared/types";
import { createRoute, useNavigate } from "@tanstack/react-router";

import { rootRoute } from "./__root";

export const connectionEditRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/connections/$id/edit",
	component: ConnectionEdit,
});

function ConnectionEdit() {
	const { id } = connectionEditRoute.useParams();
	const navigate = useNavigate();
	const { connections, selected, update } = useConnections();

	const connectionId = Number(id);
	const editingConnection = connections.find((c) => c.id === connectionId) ?? null;

	const handleSave = async (data: NewConnection): Promise<Connection | undefined> => {
		await update({ ...data, id: connectionId });
		void navigate({ to: `/connections/${id}` });
		return { ...selected, ...data } as Connection;
	};

	const handleCancel = () => {
		void navigate({ to: `/connections/${id}` });
	};

	const handleSaveAndConnect = (connection: Connection) => {
		void navigate({ to: "/browse/$connectionId", params: { connectionId: String(connection.id) } });
	};

	return (
		<div className="flex flex-1 items-start justify-center overflow-auto bg-surface">
			<div className="w-full max-w-2xl p-6 md:p-10">
				<ConnectionForm
					initial={editingConnection}
					onSave={handleSave}
					onCancel={handleCancel}
					onConnect={handleSaveAndConnect}
				/>
			</div>
		</div>
	);
}
