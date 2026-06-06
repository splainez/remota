import { LoggerFactory } from "@shared/lib/logger";
import { classifyError, type SftpErrorInfo } from "@shared/sftp-error";
import type { FileEntry } from "@shared/types";
import { useCallback, useEffect, useRef, useState } from "react";

const logger = LoggerFactory.init({ name: "renderer.useFileList" });

interface UseFileListOptions {
	type?: "local" | "remote";
	connectionId?: number;
}

export interface UseFileListResult {
	entries: FileEntry[];
	loading: boolean;
	error: SftpErrorInfo | null;
	refresh: () => Promise<void>;
	refreshSilently: () => Promise<void>;
}

export function useFileList(path: string, opts: UseFileListOptions = {}): UseFileListResult {
	const { type = "local", connectionId } = opts;
	const [entries, setEntries] = useState<FileEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<SftpErrorInfo | null>(null);
	const loadIdRef = useRef(0);

	const load = useCallback(
		async (silent = false) => {
			const loadId = ++loadIdRef.current;
			if (!silent) {
				setLoading(true);
			}
			setError(null);
			try {
				let result: FileEntry[];
				if (type === "remote" && connectionId !== undefined) {
					result = await window.api.filesystem.remoteList(connectionId, path);
				} else {
					result = await window.api.filesystem.list(path);
				}
				if (loadId === loadIdRef.current) {
					setEntries(result);
					setLoading(false);
				}
			} catch (err) {
				if (loadId === loadIdRef.current) {
					setError(classifyError(err));
					setEntries([]);
					setLoading(false);
				}
			}
		},
		[path, type, connectionId],
	);

	const refresh = useCallback(() => load(false), [load]);
	const refreshSilently = useCallback(() => load(true), [load]);

	useEffect(() => {
		load(false).catch((error: unknown) => {
			logger.error("load failed", { error });
		});
	}, [load]);

	return { entries, loading, error, refresh, refreshSilently };
}
