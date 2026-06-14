import { ActiveTransfers } from "@renderer/components/ActiveTransfers/ActiveTransfers";
import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@renderer/components/ui/resizable";
import { useI18n } from "@renderer/hooks/useI18n";
import { useRemoteConnection } from "@renderer/hooks/useRemoteConnection";
import { useActiveSessionsStore } from "@renderer/store/activeSessions";
import { useFilePaneStore } from "@renderer/store/filePane";
import { useTransferPanelStore } from "@renderer/store/transferPanel";
import { LoggerFactory } from "@shared/lib/logger";
import type { Connection } from "@shared/types";
import { useEffect, useRef, useState } from "react";

import { Breadcrumb } from "./Breadcrumb";
import { FilePane } from "./FilePane";

const logger = LoggerFactory.init({ name: "renderer.FileBrowser" });

interface FileBrowserProps {
	connection: Connection;
	initialShowTerminal?: boolean;
	onDisconnect?: () => void;
}

export function FileBrowser({ connection, initialShowTerminal = false, onDisconnect }: FileBrowserProps) {
	const { t } = useI18n();
	const [localPath, setLocalPath] = useState<string>("");
	const [ready, setReady] = useState(false);

	const { remoteStatus, remoteError, remotePath, setRemotePath, reconnectKey, connect } = useRemoteConnection(
		connection.id,
	);
	const isTransferPanelVisible = useTransferPanelStore((s) => s.isVisible(connection.id));
	const localSize = useFilePaneStore((s) => s.getLocalSize(connection.id));
	const setLocalSize = useFilePaneStore((s) => s.setLocalSize);

	useEffect(() => {
		void useFilePaneStore.getState().load();
	}, []);

	useEffect(() => {
		let cancelled = false;

		async function init() {
			try {
				const [homeDir, savedLocal, savedRemote] = await Promise.all([
					window.api.filesystem.homeDir(),
					window.api.filesystem.getLastPath(connection.id, "local"),
					window.api.filesystem.getLastPath(connection.id, "remote"),
				]);

				if (cancelled) return;

				const resolvedLocal = savedLocal ? await resolvePath(savedLocal) : homeDir;

				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- cancelled may change during await
				if (cancelled) return;

				setLocalPath(resolvedLocal);
				setRemotePath(savedRemote ?? "/");
			} catch {
				if (cancelled) return;
				const homeDir = await window.api.filesystem.homeDir();
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- cancelled may change during await
				if (cancelled) return;
				setLocalPath(homeDir);
				setRemotePath("/");
			}

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- always set but checked for clarity
			if (!cancelled) {
				setReady(true);
			}
		}

		init().catch((error: unknown) => {
			logger.error("init failed", { error });
		});

		return () => {
			cancelled = true;
		};
	}, [connection.id, setRemotePath]);

	// Connect after ready so the connecting placeholder shows while connect is in progress
	const startedConnect = useRef(false);
	useEffect(() => {
		startedConnect.current = false;
	}, [connection.id]);
	useEffect(() => {
		if (ready && !startedConnect.current) {
			startedConnect.current = true;
			connect()
				.then(() => {
					useActiveSessionsStore.getState().updateSessionStatus(connection.id, "connected");
				})
				.catch((error: unknown) => {
					useActiveSessionsStore.getState().removeSession(connection.id);
					logger.error("connect failed", { error });
				});
		}
	}, [ready, connect, connection.id]);

	if (!ready) {
		return <div className="flex h-full flex-col overflow-hidden" />;
	}

	return (
		<div className="flex h-full flex-col overflow-hidden">
			{/* Top App Bar / Breadcrumbs */}
			<header className="flex h-12 w-full shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-4">
				{/* Local Path */}
				<div className="flex min-w-0 flex-1 items-center gap-2 pr-4">
					<Icon name="server" size={16} className="shrink-0 text-on-surface-variant" />
					<Breadcrumb path={localPath} onNavigate={setLocalPath} className="h-auto border-none bg-transparent p-0" />
				</div>

				{/* Transfer Action */}
				<div className="flex shrink-0 items-center justify-center px-4">
					<Button
						variant="default"
						size="sm"
						className="shadow-sm hover:bg-surface-tint"
						onClick={() => {
							/* Sync folders - no-op for now */
						}}
					>
						<Icon name="sync" size={14} />
						{t("file.syncFolders")}
					</Button>
				</div>

				{/* Remote Path + Disconnect */}
				<div className="flex min-w-0 flex-1 items-center justify-end gap-2 pl-4">
					<Breadcrumb path={remotePath} onNavigate={setRemotePath} className="h-auto border-none bg-transparent p-0" />
					<Icon name="globe" size={16} className="shrink-0 text-on-surface-variant" />
					<Button
						variant="ghost"
						size="icon-sm"
						className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
						aria-label={t("connection.disconnect")}
						title={t("connection.disconnect")}
						onClick={onDisconnect}
					>
						<Icon name="close" size={16} />
					</Button>
				</div>
			</header>

			{/* Dual Pane Explorer + optional Active Transfers panel */}
			<ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
				<ResizablePanel id="file-panes" defaultSize={80} minSize={30}>
					<ResizablePanelGroup
						orientation="horizontal"
						className="h-full"
						onLayoutChanged={(panelSize) => {
							setLocalSize(connection.id, panelSize["local-pane"] ?? 50);
						}}
					>
						<ResizablePanel id="local-pane" defaultSize={localSize} minSize={20}>
							<FilePane
								type="local"
								connectionId={connection.id}
								initialPath={localPath}
								peerLocalPath={localPath}
								peerRemotePath={remotePath}
								onPathChange={setLocalPath}
							/>
						</ResizablePanel>
						<ResizableHandle withHandle />
						<ResizablePanel id="remote-pane" defaultSize={100 - localSize} minSize={20}>
							<FilePane
								key={reconnectKey}
								type="remote"
								connectionId={connection.id}
								initialPath={remotePath}
								protocol={connection.protocol}
								initialShowTerminal={initialShowTerminal}
								peerLocalPath={localPath}
								connectionError={remoteError}
								remoteStatus={remoteStatus}
								onReconnect={() => {
									connect().catch((error: unknown) => {
										logger.error("reconnect failed", { error });
									});
								}}
								onPathChange={setRemotePath}
							/>
						</ResizablePanel>
					</ResizablePanelGroup>
				</ResizablePanel>

				{isTransferPanelVisible && (
					<>
						<ResizableHandle withHandle />
						<ResizablePanel id="transfers" defaultSize={20} minSize={10}>
							<ActiveTransfers connectionId={connection.id} />
						</ResizablePanel>
					</>
				)}
			</ResizablePanelGroup>
		</div>
	);
}

async function resolvePath(path: string): Promise<string> {
	const exists = await window.api.filesystem.pathExists(path);
	if (exists) return path;
	return window.api.filesystem.homeDir();
}
