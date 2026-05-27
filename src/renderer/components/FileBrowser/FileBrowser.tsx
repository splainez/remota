import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../../../i18n";
import type { Connection } from "../../../shared/types";
import { classifyError, getErrorI18nKey, type SftpErrorInfo } from "../../../shared/sftp-error";
import { Button } from "../ui/button";
import { FilePane } from "./FilePane";

interface FileBrowserProps {
	connection: Connection;
	onDisconnect: () => void;
}

type RemoteStatus = "connecting" | "connected" | "error";

export function FileBrowser({ connection, onDisconnect }: FileBrowserProps) {
	const [localPath, setLocalPath] = useState<string>("");
	const [remotePath, setRemotePath] = useState<string>("/");
	const [ready, setReady] = useState(false);
	const [remoteStatus, setRemoteStatus] = useState<RemoteStatus>("connecting");
	const [remoteError, setRemoteError] = useState<SftpErrorInfo | null>(null);
	const [showDetail, setShowDetail] = useState(false);
	const reconnectKey = useRef(0);

	const doConnect = useCallback(async () => {
		setRemoteStatus("connecting");
		setRemoteError(null);
		try {
			const remoteHome = await window.api.filesystem.remoteConnect(connection.id);
			setRemotePath(remoteHome);
			setRemoteStatus("connected");
			reconnectKey.current++;
		} catch (err) {
			const info = classifyError(err);
			setRemoteError(info);
			setRemoteStatus("error");
		}
	}, [connection.id]);

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

				const resolvedLocal = savedLocal
					? await resolvePath(savedLocal)
					: homeDir;

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

		void init();

		return () => {
			cancelled = true;
			void window.api.filesystem.remoteDisconnect(connection.id);
		};
	}, [connection.id]);

	// Connect after ready so the connecting placeholder shows while connect is in progress
	const startedConnect = useRef(false);
	useEffect(() => {
		if (ready && !startedConnect.current) {
			startedConnect.current = true;
			void doConnect();
		}
	}, [ready, doConnect]);

	const handleDisconnect = useCallback(() => {
		void window.api.filesystem.remoteDisconnect(connection.id);
		onDisconnect();
	}, [connection.id, onDisconnect]);

	if (!ready) {
		return <div className="flex flex-col h-full overflow-hidden" />;
	}

	const errorMessage = remoteError ? t(getErrorI18nKey(remoteError.code)) : null;

	return (
		<div className="flex flex-col h-full overflow-hidden">
			<div className="flex items-center justify-between px-3 py-1 bg-surface-container-low border-b border-outline-variant shrink-0 h-9">
				<span className="text-base font-semibold text-on-surface">{connection.name}</span>
				<Button
					variant="ghost"
					size="xs"
					className="hover:bg-destructive hover:text-destructive-foreground"
					onClick={handleDisconnect}
				>
					{t("connection.disconnect")}
				</Button>
			</div>
			<div className="flex-1 flex gap-1 p-1 overflow-hidden min-h-0">
				<FilePane
					type="local"
					connectionId={connection.id}
					initialPath={localPath}
				/>
				{remoteStatus === "connected" ? (
					<FilePane
						// eslint-disable-next-line react-hooks/refs
						key={reconnectKey.current}
						type="remote"
						connectionId={connection.id}
						initialPath={remotePath}
						onReconnect={() => { void doConnect(); }}
					/>
				) : remoteStatus === "connecting" ? (
					<div className="flex-1 flex flex-col items-center justify-center bg-surface-container-low border border-outline-variant rounded-md text-muted-foreground text-sm">
						{t("remote.connecting")}
					</div>
				) : (
					<div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 bg-surface-container-low border border-destructive/30 rounded-md">
						<span className="text-sm font-semibold text-destructive text-center">
							{errorMessage ?? t("remote.connectionError")}
						</span>
						<Button variant="default" size="sm" onClick={() => { void doConnect(); }}>
							{t("remote.retry")}
						</Button>
						{remoteError && (
							<div className="w-full max-w-md">
								<button
									className="text-xs text-primary hover:underline cursor-pointer"
									onClick={() => { setShowDetail((v) => !v); }}
								>
									{showDetail ? t("remote.hideDetails") : t("remote.showDetails")}
								</button>
								{showDetail && (
									<pre className="text-xs text-muted-foreground bg-surface-container p-2 rounded mt-1 max-w-full overflow-auto whitespace-pre-wrap break-all">
										{remoteError.technicalDetail}
									</pre>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

async function resolvePath(path: string): Promise<string> {
	const exists = await window.api.filesystem.pathExists(path);
	if (exists) return path;
	return window.api.filesystem.homeDir();
}
