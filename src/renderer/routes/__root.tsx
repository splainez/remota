/* eslint-disable react-refresh/only-export-components -- route config + component co-location is Tanstack Router convention */
import { DisconnectConfirmDialog } from "@renderer/components/FileBrowser/DisconnectConfirmDialog";
import { Icon } from "@renderer/components/icons/Icon";
import { QuitConfirmDialog } from "@renderer/components/QuitConfirmDialog";
import { ServerSidebar } from "@renderer/components/ServerSidebar/ServerSidebar";
import { Button } from "@renderer/components/ui/button";
import { useConnections } from "@renderer/hooks/useConnections";
import { useI18n } from "@renderer/hooks/useI18n";
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
	const { connections, selected, loading, select } = useConnections();

	const loadTransferPanels = useTransferPanelStore((s) => s.load);
	useEffect(() => {
		loadTransferPanels().catch((error: unknown) => {
			logger.error("loadTransferPanels failed", { error });
		});
	}, [loadTransferPanels]);

	const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
	const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
	const [quitDialogOpen, setQuitDialogOpen] = useState(false);

	useEffect(() => {
		const unsub = window.api.app.onAppConfirmQuit(() => {
			setQuitDialogOpen(true);
		});
		return unsub;
	}, []);

	const activeConnectionId = useActiveConnectionId();
	const isTransferPanelVisible = useTransferPanelStore((s) =>
		activeConnectionId == null ? false : s.isVisible(activeConnectionId),
	);
	const hasActiveTransfers = useTransferStore((s) =>
		activeConnectionId == null ? false : s.pendingCount(activeConnectionId) > 0,
	);
	const toggleTransferPanel = useTransferPanelStore((s) => s.toggle);

	const navigateTo = useCallback(
		(to: string) => {
			void router.navigate({ to });
		},
		[router],
	);

	const requestNavigation = useCallback(
		(to: string) => {
			if (activeConnectionId != null && hasActiveTransfers) {
				setPendingNavigation(to);
				setDisconnectDialogOpen(true);
				return;
			}
			navigateTo(to);
		},
		[activeConnectionId, hasActiveTransfers, navigateTo],
	);

	const handleDisconnect = useCallback(() => {
		requestNavigation("/");
	}, [requestNavigation]);

	const handleConfirmDisconnect = useCallback(() => {
		if (activeConnectionId != null) {
			void window.api.filesystem.cancelTransfersForConnection(activeConnectionId);
			void window.api.filesystem.remoteDisconnect(activeConnectionId);
		}
		setDisconnectDialogOpen(false);
		const target = pendingNavigation ?? "/";
		setPendingNavigation(null);
		navigateTo(target);
	}, [activeConnectionId, pendingNavigation, navigateTo]);

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
		requestNavigation(`/connections/${String(id)}`);
	};

	const handleAdd = () => {
		select(null);
		requestNavigation("/connections/new");
	};

	const handleOpenFileBrowser = (id: number) => {
		const conn = connections.find((c) => c.id === id);
		if (conn) {
			requestNavigation(`/browse/${String(conn.id)}`);
		}
	};

	const handleSettings = () => {
		requestNavigation("/settings");
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
			<div className="flex h-screen overflow-hidden bg-background">
				<Toaster position="bottom-right" richColors />
				<ServerSidebar
					connections={connections}
					selectedId={selected?.id ?? null}
					activeConnectionId={activeConnectionId}
					onSelect={handleSelect}
					onAdd={handleAdd}
					onDoubleClick={handleOpenFileBrowser}
					onViewAll={() => {
						requestNavigation("/");
					}}
					onDisconnect={handleDisconnect}
					onSettings={handleSettings}
				/>

				<div className="flex-1 flex flex-col min-w-0">
					<Outlet />

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
