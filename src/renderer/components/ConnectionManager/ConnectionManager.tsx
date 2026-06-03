import { useConnections } from "@renderer/hooks/useConnections";
import type { Connection } from "@shared/types";
import { useState } from "react";

import { ConnectionDetail } from "./ConnectionDetail";
import { Sidebar } from "./Sidebar";

interface ConnectionManagerProps {
	onConnect: (connection: Connection) => void;
}

export function ConnectionManager({ onConnect }: ConnectionManagerProps) {
	const { connections, selected, loading, select, create, update, remove } = useConnections();

	const [isNew, setIsNew] = useState(false);
	const [isEditing, setIsEditing] = useState(false);

	const handleSelect = (id: number) => {
		setIsNew(false);
		setIsEditing(false);
		select(id);
	};

	const handleAdd = () => {
		select(null);
		setIsNew(true);
		setIsEditing(true);
	};

	const handleCancel = () => {
		if (isNew) {
			setIsNew(false);
			setIsEditing(false);
			if (connections.length > 0) {
				select(connections[0].id);
			}
		} else {
			setIsEditing(false);
		}
	};

	const handleDoubleClick = (id: number) => {
		const conn = connections.find((c) => c.id === id);
		if (conn) {
			onConnect(conn);
		}
	};

	if (loading) {
		return null;
	}

	return (
		<div className="flex h-full overflow-hidden">
			<Sidebar
				connections={connections}
				selectedId={selected?.id ?? null}
				onSelect={handleSelect}
				onAdd={handleAdd}
				onDoubleClick={handleDoubleClick}
			/>
			<ConnectionDetail
				connection={selected}
				isNew={isNew}
				isEditing={isEditing}
				onEdit={() => {
					setIsEditing(true);
				}}
				onCancel={handleCancel}
				onConnect={() => {
					if (selected) onConnect(selected);
				}}
				onSave={async (data) => {
					if (isNew) {
						const created = await create(data);
						setIsNew(false);
						setIsEditing(false);
						onConnect(created);
					} else if (selected) {
						await update({ ...data, id: selected.id });
						setIsEditing(false);
					}
				}}
				onDelete={async (id) => {
					await remove(id);
				}}
			/>
		</div>
	);
}
