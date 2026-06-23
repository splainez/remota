import { LoggerFactory } from "@shared/lib/logger";
import { classifyError, getErrorI18nKey } from "@shared/sftp-error";
import type { FileEntry } from "@shared/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "./useI18n";

const logger = LoggerFactory.init({ name: "renderer.useFilePermissions" });

export interface UnixUser {
	name: string;
	uid: number;
}

export interface UnixGroup {
	name: string;
	gid: number;
}

export interface UseFilePermissionsParams {
	connectionId: number;
	refresh: () => Promise<void>;
}

export interface UseFilePermissionsResult {
	open: boolean;
	entry: FileEntry | null;
	users: UnixUser[];
	groups: UnixGroup[];
	loading: boolean;
	openDialog: (entry: FileEntry) => Promise<void>;
	closeDialog: () => void;
	applyPermissions: (data: { mode: string; uid: number; gid: number }) => Promise<void>;
}

export function useFilePermissions({ connectionId, refresh }: UseFilePermissionsParams): UseFilePermissionsResult {
	const { t } = useI18n();
	const [open, setOpen] = useState(false);
	const [entry, setEntry] = useState<FileEntry | null>(null);
	const [users, setUsers] = useState<UnixUser[]>([]);
	const [groups, setGroups] = useState<UnixGroup[]>([]);
	const [loading, setLoading] = useState(false);
	const refreshRef = useRef(refresh);
	const connectionIdRef = useRef(connectionId);

	useEffect(() => {
		refreshRef.current = refresh;
		connectionIdRef.current = connectionId;
	});

	const openDialog = useCallback(async (fileEntry: FileEntry) => {
		setEntry(fileEntry);
		setOpen(true);
		setLoading(true);
		try {
			const [usersResult, groupsResult] = await Promise.all([
				window.api.filesystem.remoteListUsers(connectionIdRef.current),
				window.api.filesystem.remoteListGroups(connectionIdRef.current),
			]);
			setUsers(usersResult);
			setGroups(groupsResult);
		} catch {
			setUsers([]);
			setGroups([]);
		} finally {
			setLoading(false);
		}
	}, []);

	const closeDialog = useCallback(() => {
		setOpen(false);
		setEntry(null);
		setUsers([]);
		setGroups([]);
	}, []);

	const applyPermissions = useCallback(
		async (data: { mode: string; uid: number; gid: number }) => {
			const currentEntry = entry;
			if (!currentEntry) return;

			try {
				await Promise.all([
					window.api.filesystem.remoteChmod(connectionIdRef.current, currentEntry.fullPath, data.mode),
					window.api.filesystem.remoteChown(connectionIdRef.current, currentEntry.fullPath, data.uid, data.gid),
				]);
				closeDialog();
				await refreshRef.current();
			} catch (err: unknown) {
				logger.error("apply permissions failed", { path: currentEntry.fullPath, error: err });
				const errorInfo = classifyError(err);
				const i18nKey = getErrorI18nKey(errorInfo.code);
				toast.error(t(i18nKey === "remote.error.unknown" ? "file.permissions.applyError" : i18nKey));
			}
		},
		[entry, closeDialog, t],
	);

	return {
		open,
		entry,
		users,
		groups,
		loading,
		openDialog,
		closeDialog,
		applyPermissions,
	};
}
