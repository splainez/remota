import { useState } from "react";
import { t } from "../i18n";
import type { Connection, NewConnection } from "../shared/types";
import { useConnections } from "./hooks/useConnections";
import { ServerSidebar } from "./components/ServerSidebar/ServerSidebar";
import { ConnectionDetail } from "./components/ConnectionManager/ConnectionDetail";
import { ConnectionForm } from "./components/ConnectionManager/ConnectionForm";
import { FileBrowser } from "./components/FileBrowser/FileBrowser";
import { ActiveTransfers } from "./components/ActiveTransfers/ActiveTransfers";
import { Icon } from "./components/icons/Icon";

export function App() {
	const {
		connections,
		selected,
		loading,
		select,
		create,
		update,
		remove,
	} = useConnections();

	const [isNew, setIsNew] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [activeConnection, setActiveConnection] = useState<Connection | null>(null);
	const [showTransfers, setShowTransfers] = useState(true);

	const handleSelect = (id: number) => {
		setIsNew(false);
		setIsEditing(false);
		setActiveConnection(null);
		select(id);
	};

	const handleAdd = () => {
		select(null);
		setIsNew(true);
		setIsEditing(true);
		setActiveConnection(null);
	};

	const handleDoubleClick = (id: number) => {
		const conn = connections.find((c) => c.id === id);
		if (conn) {
			setActiveConnection(conn);
		}
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

	const handleSave = async (data: NewConnection): Promise<Connection | undefined> => {
		if (isNew) {
			const created = await create(data);
			setIsNew(false);
			setIsEditing(false);
			return created;
		} else if (selected) {
			await update({ ...data, id: selected.id });
			setIsEditing(false);
			return { ...selected, ...data };
		}
	};

	const handleSaveAndConnect = async (data: NewConnection) => {
		const conn = await handleSave(data);
		if (conn) {
			setActiveConnection(conn);
		} else if (selected) {
			setActiveConnection(selected);
		}
	};

	const handleDelete = async (id: number) => {
		await remove(id);
	};

	if (loading) {
		return (
			<div className="flex h-screen overflow-hidden bg-background">
				<div className="w-20 bg-surface-container-low border-r border-outline-variant shrink-0" />
				<div className="flex-1 flex items-center justify-center">
					<div className="text-muted-foreground">{t("file.loading")}</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-screen overflow-hidden bg-background">
			<ServerSidebar
				connections={connections}
				selectedId={selected?.id ?? null}
				activeConnectionId={activeConnection?.id ?? null}
				onSelect={handleSelect}
				onAdd={handleAdd}
				onDoubleClick={handleDoubleClick}
			/>

			<div className="flex-1 flex flex-col min-w-0">
				{activeConnection ? (
					<FileBrowser
						connection={activeConnection}
					/>
				) : isNew || (selected && isEditing) ? (
					<div className="flex-1 flex items-start justify-center bg-surface overflow-auto">
						<div className="w-full max-w-2xl p-6 md:p-10">
							{isNew ? (
								<ConnectionForm
									initial={null}
									onSave={handleSave}
									onCancel={handleCancel}
									onConnect={(data) => { handleSaveAndConnect(data).catch(() => { /* noop */ }); }}
								/>
							) : (
								<ConnectionForm
									initial={selected}
									onSave={handleSave}
									onCancel={handleCancel}
									onConnect={(data) => { handleSaveAndConnect(data).catch(() => { /* noop */ }); }}
								/>
							)}
						</div>
					</div>
				) : selected ? (
					<div className="flex-1 flex items-start justify-center bg-surface overflow-auto">
						<div className="w-full max-w-2xl p-6 md:p-10">
							<ConnectionDetail
								connection={selected}
								isNew={false}
								isEditing={false}
								onEdit={() => { setIsEditing(true); }}
								onCancel={handleCancel}
								onConnect={() => { setActiveConnection(selected); }}
								onSave={handleSave}
								onDelete={handleDelete}
							/>
						</div>
					</div>
				) : (
					<div className="flex-1 flex items-center justify-center bg-surface overflow-auto">
						<div className="text-center text-muted-foreground">
							<Icon name="plug" size={48} className="mb-3 opacity-40 mx-auto" />
							<div className="text-base">{t("connection.noSelection")}</div>
						</div>
					</div>
				)}

				<ActiveTransfers visible={showTransfers} onToggle={() => { setShowTransfers((v) => !v); }} />

				<footer className="h-8 w-full bg-surface-container-lowest border-t border-outline-variant flex items-center justify-between px-4 shrink-0 text-xs text-muted-foreground z-10">
					<div className="flex items-center gap-2">
						<span className="w-2 h-2 rounded-full bg-primary" />
						<span>{t("app.ready")}</span>
					</div>
					<div className="flex items-center gap-3">
						{!showTransfers && (
							<button
								className="flex items-center gap-1 hover:text-foreground transition-colors"
								onClick={() => { setShowTransfers(true); }}
							>
								<Icon name="sync" size={14} />
								<span>{t("transfer.active")}</span>
							</button>
						)}
						<span>{t("app.version")}</span>
					</div>
				</footer>
			</div>
		</div>
	);
}
