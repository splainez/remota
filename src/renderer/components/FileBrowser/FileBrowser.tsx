import { ActiveTransfers } from "@renderer/components/ActiveTransfers/ActiveTransfers";
import { Icon } from "@renderer/components/icons/Icon";
import { Button } from "@renderer/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@renderer/components/ui/resizable";
import { useI18n } from "@renderer/hooks/useI18n";
import { useRemoteConnection } from "@renderer/hooks/useRemoteConnection";
import { useTransferProgress } from "@renderer/hooks/useTransferProgress";
import { useTransferPanelStore } from "@renderer/store/transferPanel";
import { LoggerFactory } from "@shared/lib/logger";
import { getErrorI18nKey } from "@shared/sftp-error";
import type { Connection } from "@shared/types";
import { useEffect, useRef, useState } from "react";

import { Breadcrumb } from "./Breadcrumb";
import { FilePane } from "./FilePane";
import { ToggleableError } from "./ToggleableError";

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

	useTransferProgress();

	const { remoteStatus, remoteError, remotePath, setRemotePath, reconnectKey, connect } = useRemoteConnection(
		connection.id,
	);
	const isTransferPanelVisible = useTransferPanelStore((s) => s.isVisible(connection.id));

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
			window.api.filesystem.remoteDisconnect(connection.id).catch((error: unknown) => {
				logger.error("remoteDisconnect failed", { connectionId: connection.id, error });
			});
		};
	}, [connection.id, setRemotePath]);

	// Connect after ready so the connecting placeholder shows while connect is in progress
	const startedConnect = useRef(false);
	useEffect(() => {
		if (ready && !startedConnect.current) {
			startedConnect.current = true;
			connect().catch((error: unknown) => {
				logger.error("connect failed", { error });
			});
		}
	}, [ready, connect]);

	if (!ready) {
		return <div className="flex flex-col h-full overflow-hidden" />;
	}

	const errorMessage = remoteError ? t(getErrorI18nKey(remoteError.code)) : null;

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Top App Bar / Breadcrumbs */}
			<header className="h-12 w-full bg-surface border-b border-outline-variant flex justify-between items-center px-4 shrink-0">
				{/* Local Path */}
				<div className="flex items-center flex-1 min-w-0 pr-4 gap-2">
					<Icon name="server" size={16} className="text-on-surface-variant shrink-0" />
					<Breadcrumb path={localPath} onNavigate={setLocalPath} className="bg-transparent border-none p-0 h-auto" />
				</div>

				{/* Transfer Action */}
				<div className="flex items-center justify-center px-4 shrink-0">
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
				<div className="flex items-center flex-1 min-w-0 pl-4 justify-end gap-2">
					<Breadcrumb path={remotePath} onNavigate={setRemotePath} className="bg-transparent border-none p-0 h-auto" />
					<Icon name="globe" size={16} className="text-on-surface-variant shrink-0" />
					<Button
						variant="ghost"
						size="icon-sm"
						className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
						aria-label={t("connection.disconnect")}
						title={t("connection.disconnect")}
						onClick={onDisconnect}
					>
						<Icon name="close" size={16} />
					</Button>
				</div>
			</header>

			{/* Dual Pane Explorer + optional Active Transfers panel */}
			<ResizablePanelGroup orientation="vertical" className="flex-1 min-h-0">
				<ResizablePanel id="file-panes" defaultSize={80} minSize={30}>
					<main className="flex h-full min-h-0 relative">
						<FilePane
							type="local"
							connectionId={connection.id}
							initialPath={localPath}
							peerLocalPath={localPath}
							onPathChange={setLocalPath}
						/>
						{remoteStatus === "connected" ? (
							<FilePane
								key={reconnectKey}
								type="remote"
								connectionId={connection.id}
								initialPath={remotePath}
								protocol={connection.protocol}
								initialShowTerminal={initialShowTerminal}
								peerLocalPath={localPath}
								onReconnect={() => {
									connect().catch((error: unknown) => {
										logger.error("reconnect failed", { error });
									});
								}}
								onPathChange={setRemotePath}
							/>
						) : (
							<div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 bg-surface-container-lowest border-l border-outline-variant">
								{remoteStatus === "connecting" ? (
									<ToggleableError message={t("remote.connecting")} />
								) : (
									<>
										<ToggleableError
											message={errorMessage ?? t("remote.connectionError")}
											detail={remoteError?.technicalDetail}
										/>
										<Button
											variant="default"
											size="sm"
											onClick={() => {
												connect().catch((error: unknown) => {
													logger.error("retry connect failed", { error });
												});
											}}
										>
											{t("remote.retry")}
										</Button>
									</>
								)}
							</div>
						)}
					</main>
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
