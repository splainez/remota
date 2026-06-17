import { LoggerFactory } from "@shared/lib/logger";
import { classifyError, getErrorI18nKey } from "@shared/sftp-error";
import type { FileEntry } from "@shared/types";
import { fileNameSchema } from "@shared/validation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "./useI18n";

const logger = LoggerFactory.init({ name: "renderer.useCreateItem" });

type CreateType = "folder" | "file";

export interface UseCreateItemParams {
	panelType: "local" | "remote";
	connectionId: number;
	currentPath: string;
	entries: FileEntry[];
	refresh: () => Promise<void>;
}

export interface UseCreateItemResult {
	creatingType: CreateType | null;
	startCreate: (type: CreateType) => void;
	commitCreate: (name: string) => void;
	cancelCreate: () => void;
}

export function useCreateItem({
	panelType,
	connectionId,
	currentPath,
	entries,
	refresh,
}: UseCreateItemParams): UseCreateItemResult {
	const { t } = useI18n();
	const [creatingType, setCreatingType] = useState<CreateType | null>(null);
	const creatingRef = useRef(false);
	const creatingTypeRef = useRef<CreateType | null>(null);
	const startPathRef = useRef<string>("");
	const entriesRef = useRef(entries);
	const panelTypeRef = useRef(panelType);
	const connectionIdRef = useRef(connectionId);
	const refreshRef = useRef(refresh);

	useEffect(() => {
		entriesRef.current = entries;
		panelTypeRef.current = panelType;
		connectionIdRef.current = connectionId;
		refreshRef.current = refresh;
	});

	const startCreate = useCallback(
		(type: CreateType) => {
			creatingRef.current = false;
			creatingTypeRef.current = type;
			startPathRef.current = currentPath;
			setCreatingType(type);
		},
		[currentPath],
	);

	const cancelCreate = useCallback(() => {
		creatingTypeRef.current = null;
		setCreatingType(null);
	}, []);

	const commitCreate = useCallback(
		(name: string) => {
			const type = creatingTypeRef.current;
			if (type === null) return;

			const trimmed = name.trim();
			if (trimmed.length === 0) {
				cancelCreate();
				return;
			}

			const parsed = fileNameSchema.safeParse(trimmed);
			if (!parsed.success) {
				cancelCreate();
				const messageKey = parsed.error.issues[0]?.message ?? "validation.default";
				toast.error(t(messageKey as Parameters<typeof t>[0]));
				return;
			}

			const exists = entriesRef.current.some((e) => e.name === trimmed);
			if (exists) {
				const duplicateKey = type === "folder" ? "file.createFolder.duplicate" : "file.createFile.duplicate";
				toast.error(t(duplicateKey));
				return;
			}

			if (creatingRef.current) return;
			creatingRef.current = true;

			const errorKey = type === "folder" ? "file.createFolder.error" : "file.createFile.error";
			const path = startPathRef.current;
			const pType = panelTypeRef.current;
			const cId = connectionIdRef.current;

			const promise = (async () => {
				if (pType === "remote") {
					if (type === "folder") {
						await window.api.filesystem.remoteMkdir(cId, path, trimmed);
					} else {
						await window.api.filesystem.remoteCreateFile(cId, path, trimmed);
					}
				} else if (type === "folder") {
					await window.api.filesystem.mkdir(path, trimmed);
				} else {
					await window.api.filesystem.createFile(path, trimmed);
				}
			})();

			promise
				.then(() => {
					creatingTypeRef.current = null;
					setCreatingType(null);
					return refreshRef.current();
				})
				.catch((err: unknown) => {
					logger.error("create item failed", { type, name: trimmed, error: err });
					const errorInfo = classifyError(err);
					toast.error(
						t(getErrorI18nKey(errorInfo.code) === "remote.error.unknown" ? errorKey : getErrorI18nKey(errorInfo.code)),
					);
					creatingTypeRef.current = null;
					setCreatingType(null);
				})
				.finally(() => {
					creatingRef.current = false;
				});
		},
		[cancelCreate, t],
	);

	return {
		creatingType,
		startCreate,
		commitCreate,
		cancelCreate,
	};
}
