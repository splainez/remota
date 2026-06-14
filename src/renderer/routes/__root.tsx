/* eslint-disable react-refresh/only-export-components -- route config + component co-location is Tanstack Router convention */
import { DisconnectConfirmDialog } from "@renderer/components/FileBrowser/DisconnectConfirmDialog";
import { QuitConfirmDialog } from "@renderer/components/QuitConfirmDialog";
import { ServerSidebar } from "@renderer/components/ServerSidebar/ServerSidebar";
import { StatusBar } from "@renderer/components/StatusBar/StatusBar";
import { TitleBar } from "@renderer/components/TitleBar/TitleBar";
import { SidebarProvider } from "@renderer/components/ui/sidebar";
import { useConnections } from "@renderer/hooks/useConnections";
import { useI18n } from "@renderer/hooks/useI18n";
import { useTransferProgress } from "@renderer/hooks/useTransferProgress";
import { useActiveSessionsStore } from "@renderer/store/activeSessions";
import { useTransferStore } from "@renderer/store/transfer";
import { useTransferPanelStore } from "@renderer/store/transferPanel";
import { LoggerFactory } from "@shared/lib/logger";
import { Outlet, createRootRoute, useRouter, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Toaster } from "sonner";

const logger = LoggerFactory.init({ name: "renderer.routes.root" });

function useActiveConnectionId(): number | null {
	const routerState = useRouterState();
	const pathname = routerState.location.pathname;
	return useMemo(() => {
		const match = /^\/browse\/(\d+)$/.exec(pathname);
		return match != null ? Number(match[1]) : null;
	}, [pathname]);
}

export const rootRoute = createRootRoute({
	component: RootLayout,
});

function RootLayout() {
	const { t } = useI18n();
	const router = useRouter();
	const { connections, loading, select } = useConnections();
	const sessions = useActiveSessionsStore((s) => s.sessions);
	const addSession = useActiveSessionsStore((s) => s.addSession);
	const removeSession = useActiveSessionsStore((s) => s.removeSession);

	useTransferProgress();

	const loadTransferPanels = useTransferPanelStore((s) => s.load);
	useEffect(() => {
		loadTransferPanels().catch((error: unknown) => {
			logger.error("loadTransferPanels failed", { error });
		});
	}, [loadTransferPanels]);

	const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
	const [disconnectTarget, setDisconnectTarget] = useState<number | null>(null);
	const [quitDialogOpen, setQuitDialogOpen] = useState(false);

	useEffect(() => {
		const unsub = window.api.app.onAppConfirmQuit(() => {
			setQuitDialogOpen(true);
		});
		return unsub;
	}, []);

	const [pendingConnectionId, setPendingConnectionId] = useState<number | null>(null);

	useEffect(() => {
		void window.api.app.getPendingConnection().then((id) => {
			if (id != null) {
				setPendingConnectionId(id);
			}
		});
	}, []);

	useEffect(() => {
		if (pendingConnectionId != null && !loading && connections.some((c) => c.id === pendingConnectionId)) {
			addSession(pendingConnectionId);
			void router.navigate({
				to: "/browse/$connectionId",
				params: { connectionId: String(pendingConnectionId) },
			});
			setPendingConnectionId(null);
		}
	}, [pendingConnectionId, loading, connections, router, addSession]);

	useEffect(() => {
		const unsub = window.api.app.onOpenConnection((connectionId) => {
			if (connections.some((c) => c.id === connectionId)) {
				addSession(connectionId);
				void router.navigate({ to: "/browse/$connectionId", params: { connectionId: String(connectionId) } });
			}
		});
		return unsub;
	}, [connections, router, addSession]);

	const activeConnectionId = useActiveConnectionId();
	const isTransferPanelVisible = useTransferPanelStore((s) =>
		activeConnectionId == null ? false : s.isVisible(activeConnectionId),
	);
	const toggleTransferPanel = useTransferPanelStore((s) => s.toggle);

	const disconnectConnection = useCallback(
		(connectionId: number) => {
			const hasTransfers = useTransferStore.getState().pendingCount(connectionId) > 0;
			if (hasTransfers) {
				setDisconnectTarget(connectionId);
				setDisconnectDialogOpen(true);
				return;
			}
			void (async () => {
				await window.api.filesystem.remoteDisconnect(connectionId);
				removeSession(connectionId);
				if (activeConnectionId === connectionId) {
					void router.navigate({ to: "/" });
				}
			})();
		},
		[activeConnectionId, removeSession, router],
	);

	const handleConfirmDisconnect = useCallback(() => {
		setDisconnectDialogOpen(false);
		const target = disconnectTarget;
		setDisconnectTarget(null);
		if (target != null) {
			useTransferStore.getState().clearAll(target);
			void (async () => {
				await window.api.filesystem.cancelTransfersForConnection(target);
				await window.api.filesystem.remoteDisconnect(target);
				removeSession(target);
				if (activeConnectionId === target) {
					void router.navigate({ to: "/" });
				}
			})();
		}
	}, [activeConnectionId, disconnectTarget, removeSession, router]);

	const handleConfirmQuit = useCallback(() => {
		setQuitDialogOpen(false);
		window.api.app.quitResponse(true);
	}, []);

	const handleQuitDialogOpenChange = useCallback((open: boolean) => {
		setQuitDialogOpen(open);
		if (!open) {
			window.api.app.quitResponse(false);
		}
	}, []);

	const handleToggleTransferPanel = () => {
		if (activeConnectionId == null) return;
		toggleTransferPanel(activeConnectionId);
	};

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
			addSession(conn.id);
			void router.navigate({ to: `/browse/${String(conn.id)}` });
		}
	};

	const handleSettings = () => {
		void router.navigate({ to: "/settings" });
	};

	if (loading) {
		return (
			<div className="flex h-screen flex-col overflow-hidden bg-background">
				<TitleBar />
				<div className="flex min-h-0 flex-1">
					<div className="w-20 shrink-0 border-r border-outline-variant bg-surface-container-low" />
					<div className="flex flex-1 items-center justify-center">
						<div className="text-muted-foreground">{t("file.loading")}</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<>
			<DisconnectConfirmDialog
				open={disconnectDialogOpen}
				onOpenChange={setDisconnectDialogOpen}
				onConfirmDisconnect={handleConfirmDisconnect}
			/>
			<QuitConfirmDialog
				open={quitDialogOpen}
				onOpenChange={handleQuitDialogOpenChange}
				onConfirmQuit={handleConfirmQuit}
			/>
			<div className="grid h-screen grid-rows-[auto_1fr] overflow-hidden bg-background">
				<Toaster position="bottom-right" richColors />
				<SidebarProvider className="min-h-0 max-w-full flex-1 flex-col">
					<TitleBar />
					<div className="flex min-h-0 max-w-full flex-1 flex-row">
						<ServerSidebar
							connections={connections}
							activeConnectionId={activeConnectionId}
							activeSessions={sessions}
							onSelect={handleSelect}
							onAdd={handleAdd}
							onDoubleClick={handleOpenFileBrowser}
							onViewAll={() => {
								void router.navigate({ to: "/" });
							}}
							onDisconnect={disconnectConnection}
							onSettings={handleSettings}
						/>

						<div className="grid min-h-0 min-w-0 flex-1 grid-rows-[1fr_auto]">
							<Outlet />

							<StatusBar
								activeConnectionId={activeConnectionId}
								isTransferPanelVisible={isTransferPanelVisible}
								onToggleTransferPanel={handleToggleTransferPanel}
							/>
						</div>
					</div>
				</SidebarProvider>
			</div>
		</>
	);
}
