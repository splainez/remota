import { LoggerFactory } from "@shared/lib/logger";
import type { Connection, NewConnection } from "@shared/types";
import { useEffect } from "react";
import { Toaster } from "sonner";

import { ConfigError } from "./components/ConfigError/ConfigError";
import { ConnectionDetail } from "./components/ConnectionManager/ConnectionDetail";
import { ConnectionForm } from "./components/ConnectionManager/ConnectionForm";
import { ConnectionListView } from "./components/ConnectionManager/ConnectionListView";
import { FileBrowser } from "./components/FileBrowser/FileBrowser";
import { Icon } from "./components/icons/Icon";
import { ServerSidebar } from "./components/ServerSidebar/ServerSidebar";
import { SettingsView } from "./components/Settings/SettingsView";
import { useConnections } from "./hooks/useConnections";
import { useI18n } from "./hooks/useI18n";
import { useAppNavigation } from "./store/appNavigation";
import { useTransferPanelStore } from "./store/transferPanel";

const logger = LoggerFactory.init({ name: "renderer.App" });

export function App() {
	const { t } = useI18n();
	const { connections, selected, loading, select, create, update, remove } = useConnections();

	const { currentView, openConnectionList, openConnectionDetail, openConnectionForm, openFileBrowser, openSettings } =
		useAppNavigation();

	const loadTransferPanels = useTransferPanelStore((s) => s.load);
	useEffect(() => {
		loadTransferPanels().catch((error: unknown) => {
			logger.error("loadTransferPanels failed", { error });
		});
	}, [loadTransferPanels]);

	const activeConnectionId = currentView.view === "fileBrowser" ? currentView.connection.id : null;
	const isTransferPanelVisible = useTransferPanelStore((s) =>
		activeConnectionId == null ? false : s.isVisible(activeConnectionId),
	);
	const toggleTransferPanel = useTransferPanelStore((s) => s.toggle);

	const handleToggleTransferPanel = () => {
		if (activeConnectionId == null) return;
		toggleTransferPanel(activeConnectionId);
	};

	const handleSelect = (id: number) => {
		select(id);
		openConnectionDetail(id);
	};

	const handleAdd = () => {
		select(null);
		openConnectionForm("new");
	};

	const handleDoubleClick = (id: number) => {
		const conn = connections.find((c) => c.id === id);
		if (conn) {
			openFileBrowser(conn);
		}
	};

	const handleCancel = () => {
		openConnectionList();
	};

	const handleSave = async (data: NewConnection): Promise<Connection | undefined> => {
		if (currentView.view === "connectionForm" && currentView.mode === "new") {
			const created = await create(data);
			openConnectionDetail(created.id);
			return created;
		} else if (currentView.view === "connectionForm" && currentView.mode === "edit" && currentView.id != null) {
			await update({ ...data, id: currentView.id });
			openConnectionDetail(currentView.id);
			return { ...selected, ...data } as Connection;
		} else if (currentView.view === "connectionDetail") {
			await update({ ...data, id: currentView.id });
			openConnectionDetail(currentView.id);
			return { ...selected, ...data } as Connection;
		}
	};

	const handleSaveAndConnect = (connection: Connection) => {
		openFileBrowser(connection);
	};

	const handleDelete = async (id: number) => {
		await remove(id);
		openConnectionList();
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

	const renderMainContent = () => {
		switch (currentView.view) {
			case "connectionList":
				return (
					<ConnectionListView
						connections={connections}
						selectedId={selected?.id ?? null}
						activeConnectionId={null}
						onSelect={handleSelect}
						onAdd={handleAdd}
						onDoubleClick={handleDoubleClick}
						onDelete={(id) => {
							handleDelete(id).catch((error: unknown) => {
								logger.error("handleDelete failed", { id, error });
							});
						}}
					/>
				);

			case "fileBrowser":
				return <FileBrowser connection={currentView.connection} />;

			case "connectionForm": {
				const editingConnection =
					currentView.mode === "edit" && currentView.id != null
						? (connections.find((c) => c.id === currentView.id) ?? null)
						: null;
				return (
					<div className="flex-1 flex items-start justify-center bg-surface overflow-auto">
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

			case "connectionDetail": {
				const detailConnection = connections.find((c) => c.id === currentView.id) ?? null;
				return (
					<div className="flex-1 flex items-start justify-center bg-surface overflow-auto">
						<div className="w-full max-w-2xl p-6 md:p-10">
							<ConnectionDetail
								connection={detailConnection}
								isNew={false}
								isEditing={false}
								onEdit={() => {
									openConnectionForm("edit", currentView.id);
								}}
								onCancel={handleCancel}
								onConnect={() => {
									if (detailConnection) openFileBrowser(detailConnection);
								}}
								onSave={handleSave}
								onDelete={handleDelete}
							/>
						</div>
					</div>
				);
			}

			case "empty":
			default:
				return (
					<div className="flex-1 flex items-center justify-center bg-surface overflow-auto">
						<div className="text-center text-muted-foreground">
							<Icon name="plug" size={48} className="mb-3 opacity-40 mx-auto" />
							<div className="text-base">{t("connection.noSelection")}</div>
						</div>
					</div>
				);

			case "settings":
				return <SettingsView onBack={openConnectionList} />;
		}
	};

	return (
		<>
			<ConfigError />
			<div className="flex h-screen overflow-hidden bg-background">
				<Toaster position="bottom-right" richColors />
				<ServerSidebar
					connections={connections}
					selectedId={selected?.id ?? null}
					activeConnectionId={currentView.view === "fileBrowser" ? currentView.connection.id : null}
					onSelect={handleSelect}
					onAdd={handleAdd}
					onDoubleClick={handleDoubleClick}
					onViewAll={openConnectionList}
					onDisconnect={openConnectionList}
					onSettings={openSettings}
				/>

				<div className="flex-1 flex flex-col min-w-0">
					{renderMainContent()}

					<footer className="h-8 w-full bg-surface-container-lowest border-t border-outline-variant flex items-center justify-between px-4 shrink-0 text-xs text-muted-foreground z-10">
						<div className="flex items-center gap-2">
							<span className="w-2 h-2 rounded-full bg-primary" />
							<span>{t("app.ready")}</span>
						</div>
						<div className="flex items-center gap-3">
							{activeConnectionId != null && !isTransferPanelVisible && (
								<button
									className="flex items-center gap-1 hover:text-foreground transition-colors"
									onClick={handleToggleTransferPanel}
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
		</>
	);
}
