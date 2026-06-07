/* eslint-disable react-refresh/only-export-components -- route config + component co-location is Tanstack Router convention */
import { ConnectionForm } from "@renderer/components/ConnectionManager/ConnectionForm";
import { useConnections } from "@renderer/hooks/useConnections";
import type { Connection, NewConnection } from "@shared/types";
import { createRoute, useNavigate } from "@tanstack/react-router";

import { rootRoute } from "./__root";

export const connectionNewRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/connections/new",
	component: ConnectionNew,
});

function ConnectionNew() {
	const navigate = useNavigate();
	const { create } = useConnections();

	const handleSave = async (data: NewConnection): Promise<Connection | undefined> => {
		const created = await create(data);
		void navigate({ to: `/connections/${String(created.id)}` });
		return created;
	};

	const handleCancel = () => {
		void navigate({ to: "/" });
	};

	const handleSaveAndConnect = (connection: Connection) => {
		void navigate({ to: "/browse/$connectionId", params: { connectionId: String(connection.id) } });
	};

	return (
		<div className="flex-1 flex items-start justify-center bg-surface overflow-auto">
			<div className="w-full max-w-2xl p-6 md:p-10">
				<ConnectionForm initial={null} onSave={handleSave} onCancel={handleCancel} onConnect={handleSaveAndConnect} />
			</div>
		</div>
	);
}
