import { connectionSupportsTerminal } from "@shared/lib/connection";
import { LoggerFactory } from "@shared/lib/logger";
import type { Connection, NewConnection } from "@shared/types";
import { useCallback, useEffect, useState } from "react";
import { toast, Toaster } from "sonner";

import { ConfigError } from "./components/ConfigError/ConfigError";
import { ConnectionDetail } from "./components/ConnectionManager/ConnectionDetail";
import { ConnectionForm } from "./components/ConnectionManager/ConnectionForm";
import { ConnectionListView } from "./components/ConnectionManager/ConnectionListView";
import { DisconnectConfirmDialog } from "./components/FileBrowser/DisconnectConfirmDialog";
import { FileBrowser } from "./components/FileBrowser/FileBrowser";
import { Icon } from "./components/icons/Icon";
import { ServerSidebar } from "./components/ServerSidebar/ServerSidebar";
import { SettingsView } from "./components/Settings/SettingsView";
import { Button } from "./components/ui/button";
import { useConnections } from "./hooks/useConnections";
import { useI18n } from "./hooks/useI18n";
import { useAppNavigation } from "./store/appNavigation";
import { useSettingsStore } from "./store/settings";
import { useTransferStore } from "./store/transfer";
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

	const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);

	const activeConnectionId = currentView.view === "fileBrowser" ? currentView.connection.id : null;
	const isTransferPanelVisible = useTransferPanelStore((s) =>
		activeConnectionId == null ? false : s.isVisible(activeConnectionId),
	);
	const hasActiveTransfers = useTransferStore((s) =>
		activeConnectionId == null ? false : s.pendingCount(activeConnectionId) > 0,
	);
	const toggleTransferPanel = useTransferPanelStore((s) => s.toggle);

	const handleDisconnect = useCallback(() => {
		if (hasActiveTransfers) {
			setDisconnectDialogOpen(true);
			return;
		}
		openConnectionList();
	}, [hasActiveTransfers, openConnectionList]);

	const handleConfirmDisconnect = useCallback(() => {
		if (activeConnectionId != null) {
			void window.api.filesystem.cancelTransfersForConnection(activeConnectionId);
		}
		setDisconnectDialogOpen(false);
		openConnectionList();
	}, [activeConnectionId, openConnectionList]);

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

	const handleOpenFileBrowser = (id: number) => {
		const conn = connections.find((c) => c.id === id);
		if (conn) {
			openFileBrowser(conn);
		}
	};

	const handleOpenTerminal = async (id: number) => {
		const conn = connections.find((c) => c.id === id);
		if (!conn || !connectionSupportsTerminal(conn)) return;

		const { externalTerminal } = useSettingsStore.getState();

		if (!externalTerminal) {
			openFileBrowser(conn, { openTerminal: true });
			return;
		}

		try {
			const lastPath = await window.api.filesystem.getLastPath(id, "remote");
			await window.api.terminal.openExternal(id, lastPath ?? undefined, "remote");
			if (externalTerminal === "iterm2" || externalTerminal === "terminal-app") {
				toast.info(t("terminal.externalOpenSshless"));
			}
		} catch (error: unknown) {
			logger.error("openExternal terminal failed; falling back to integrated", { id, error });
			openFileBrowser(conn, { openTerminal: true });
			toast.error(t("terminal.externalOpenError"));
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
						onDoubleClick={handleOpenFileBrowser}
						onOpen={handleOpenFileBrowser}
						onOpenTerminal={(id) => {
							handleOpenTerminal(id).catch((error: unknown) => {
								logger.error("handleOpenTerminal failed", { id, error });
							});
						}}
						onDelete={(id) => {
							handleDelete(id).catch((error: unknown) => {
								logger.error("handleDelete failed", { id, error });
							});
						}}
					/>
				);

			case "fileBrowser":
				return (
					<FileBrowser
						connection={currentView.connection}
						initialShowTerminal={currentView.openTerminal}
						onDisconnect={handleDisconnect}
					/>
				);

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
			<DisconnectConfirmDialog
				open={disconnectDialogOpen}
				onOpenChange={setDisconnectDialogOpen}
				onConfirmDisconnect={handleConfirmDisconnect}
			/>
			<div className="flex h-screen overflow-hidden bg-background">
				<Toaster position="bottom-right" richColors />
				<ServerSidebar
					connections={connections}
					selectedId={selected?.id ?? null}
					activeConnectionId={currentView.view === "fileBrowser" ? currentView.connection.id : null}
					onSelect={handleSelect}
					onAdd={handleAdd}
					onDoubleClick={handleOpenFileBrowser}
					onViewAll={openConnectionList}
					onDisconnect={handleDisconnect}
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
								<Button
									variant="link"
									size="sm"
									className={`h-auto p-0 text-xs gap-1 ${hasActiveTransfers ? "" : "text-muted-foreground"}`}
									onClick={handleToggleTransferPanel}
								>
									<Icon name="sync" size={14} />
									{t("transfer.active")}
								</Button>
							)}
							<span>{t("app.version")}</span>
						</div>
					</footer>
				</div>
			</div>
		</>
	);
}
