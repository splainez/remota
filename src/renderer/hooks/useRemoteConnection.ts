import { useCallback, useState } from "react";
import { classifyError, type SftpErrorInfo } from "@shared/sftp-error";

type RemoteStatus = "connecting" | "connected" | "error";

export function useRemoteConnection(connectionId: number) {
	const [remoteStatus, setRemoteStatus] = useState<RemoteStatus>("connecting");
	const [remoteError, setRemoteError] = useState<SftpErrorInfo | null>(null);
	const [reconnectKey, setReconnectKey] = useState(0);
	const [remotePath, setRemotePath] = useState<string>("/");

	const connect = useCallback(async () => {
		setRemoteStatus("connecting");
		setRemoteError(null);
		try {
			const remoteHome = await window.api.filesystem.remoteConnect(connectionId);
			setRemotePath(remoteHome);
			setRemoteStatus("connected");
			setReconnectKey((k) => k + 1);
		} catch (err) {
			const info = classifyError(err);
			setRemoteError(info);
			setRemoteStatus("error");
		}
	}, [connectionId]);

	return { remoteStatus, remoteError, remotePath, setRemotePath, reconnectKey, connect };
}
