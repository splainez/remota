/* eslint-disable react-refresh/only-export-components -- route config + component co-location is Tanstack Router convention */
import { ConnectionDetail } from "@renderer/components/ConnectionManager/ConnectionDetail";
import { useConnections } from "@renderer/hooks/useConnections";
import type { Connection, NewConnection } from "@shared/types";
import { createRoute, useNavigate } from "@tanstack/react-router";

import { rootRoute } from "./__root";

export const connectionDetailRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/connections/$id",
	component: ConnectionDetailRoute,
});

function ConnectionDetailRoute() {
	const { id } = connectionDetailRoute.useParams();
	const navigate = useNavigate();
	const { connections, selected, update, remove } = useConnections();

	const connectionId = Number(id);
	const connection = connections.find((c) => c.id === connectionId) ?? null;

	const handleEdit = () => {
		void navigate({ to: `/connections/${id}/edit` });
	};

	const handleCancel = () => {
		void navigate({ to: "/" });
	};

	const handleConnect = () => {
		if (connection) {
			void navigate({ to: "/browse/$connectionId", params: { connectionId: String(connection.id) } });
		}
	};

	const handleSave = async (data: NewConnection): Promise<Connection | undefined> => {
		await update({ ...data, id: connectionId });
		void navigate({ to: `/connections/${id}` });
		return { ...selected, ...data } as Connection;
	};

	const handleDelete = async (delId: number) => {
		await remove(delId);
		void navigate({ to: "/" });
	};

	return (
		<div className="flex-1 flex items-start justify-center bg-surface overflow-auto">
			<div className="w-full max-w-2xl p-6 md:p-10">
				<ConnectionDetail
					connection={connection}
					isNew={false}
					isEditing={false}
					onEdit={handleEdit}
					onCancel={handleCancel}
					onConnect={handleConnect}
					onSave={handleSave}
					onDelete={handleDelete}
				/>
			</div>
		</div>
	);
}
