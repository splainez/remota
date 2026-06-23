import { DuplicateDownloadDialog, type DuplicateDecision } from "@renderer/components/Dialogs/DuplicateDownloadDialog";
import { OverwriteDialog, type OverwriteDecision } from "@renderer/components/Dialogs/OverwriteDialog";
import { join as joinPath } from "@renderer/shared/path-utils";
import { useTransferStore } from "@renderer/store/transfer";
import { useTransferPanelStore } from "@renderer/store/transferPanel";
import { LoggerFactory } from "@shared/lib/logger";
import { classifyError, getErrorI18nKey } from "@shared/sftp-error";
import type { FileEntry, RemoteStat, UploadItem } from "@shared/types";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "./useI18n";

const logger = LoggerFactory.init({ name: "renderer.useUpload" });

interface ResolvedFile {
	entry: FileEntry;
	localPath: string;
	remotePath: string;
	stat: RemoteStat | null;
}

interface ConflictState {
	current: ResolvedFile;
	remaining: number;
}

interface DuplicateState {
	fileName: string;
}

export interface UseUploadParams {
	connectionId: number;
	localBasePath: string;
	remoteBasePath: string;
}

export interface UseUploadResult {
	startUpload: (entries: FileEntry[]) => Promise<void>;
	dialog: React.ReactNode;
}

let idCounter = 0;

function newId(): string {
	idCounter += 1;
	return `ul-${String(Date.now())}-${String(idCounter)}`;
}

function detectSep(p: string): "\\" | "/" {
	return p.includes("\\") ? "\\" : "/";
}

function relativeLocalPath(absolute: string, base: string): string {
	if (absolute === base) return "";
	const sep = detectSep(base);
	const normalizedBase = base.endsWith(sep) ? base : `${base}${sep}`;
	if (absolute.startsWith(normalizedBase)) {
		return absolute.slice(normalizedBase.length).replaceAll(sep, "/");
	}
	if (sep === "\\") {
		return absolute.replace(/^\\+/, "").replaceAll("\\", "/");
	}
	return absolute.replace(/^\/+/, "");
}

async function flattenLocalEntries(entries: FileEntry[], visited: Set<string>): Promise<FileEntry[]> {
	const out: FileEntry[] = [];
	for (const entry of entries) {
		if (!entry.isDirectory) {
			out.push(entry);
			continue;
		}
		const subPath = entry.fullPath;
		if (visited.has(subPath)) continue;
		visited.add(subPath);
		const childList = await window.api.filesystem.list(subPath);
		const sub = await flattenLocalEntries(childList, visited);
		out.push(...sub);
	}
	return out;
}

function buildItem(file: ResolvedFile): UploadItem {
	return {
		id: newId(),
		localPath: file.localPath,
		remotePath: file.remotePath,
		size: file.entry.size,
		mode: file.stat?.mode,
		uid: file.stat?.uid,
		gid: file.stat?.gid,
	};
}

export function useUpload({ connectionId, localBasePath, remoteBasePath }: UseUploadParams): UseUploadResult {
	const { t } = useI18n();
	const [conflict, setConflict] = useState<ConflictState | null>(null);
	const [duplicate, setDuplicate] = useState<DuplicateState | null>(null);
	const resolveRef = useRef<((d: OverwriteDecision) => void) | null>(null);
	const resolveDuplicateRef = useRef<((d: DuplicateDecision) => void) | null>(null);
	const uploadingRef = useRef(false);

	const askOverwrite = useCallback((current: ResolvedFile, remaining: number): Promise<OverwriteDecision> => {
		return new Promise<OverwriteDecision>((resolve) => {
			resolveRef.current = resolve;
			setConflict({ current, remaining });
		});
	}, []);

	const askDuplicate = useCallback((fileName: string): Promise<DuplicateDecision> => {
		return new Promise<DuplicateDecision>((resolve) => {
			resolveDuplicateRef.current = resolve;
			setDuplicate({ fileName });
		});
	}, []);

	const clearConflict = useCallback(() => {
		setConflict(null);
		resolveRef.current = null;
	}, []);

	const clearDuplicate = useCallback(() => {
		setDuplicate(null);
		resolveDuplicateRef.current = null;
	}, []);

	const handleDecision = useCallback(
		(decision: OverwriteDecision) => {
			const resolve = resolveRef.current;
			clearConflict();
			resolve?.(decision);
		},
		[clearConflict],
	);

	const handleDuplicateDecision = useCallback(
		(decision: DuplicateDecision) => {
			const resolve = resolveDuplicateRef.current;
			clearDuplicate();
			resolve?.(decision);
		},
		[clearDuplicate],
	);

	const startUpload = useCallback(
		async (entries: FileEntry[]): Promise<void> => {
			if (entries.length === 0) return;
			if (uploadingRef.current) return;
			uploadingRef.current = true;

			try {
				useTransferPanelStore.getState().notifyTransferStarted(connectionId);

				let flat: FileEntry[];
				try {
					flat = await flattenLocalEntries(entries, new Set());
				} catch (err) {
					logger.error("flatten entries failed for upload", { error: err });
					toast.error(t(getErrorI18nKey(classifyError(err).code)));
					return;
				}
				if (flat.length === 0) return;

				const resolved: ResolvedFile[] = flat.map((entry) => {
					const rel = relativeLocalPath(entry.fullPath, localBasePath);
					const remotePath = rel ? joinPath(remoteBasePath, rel) : remoteBasePath;
					return { entry, localPath: entry.fullPath, remotePath, stat: null };
				});

				const stats = await Promise.all(
					resolved.map((r) => window.api.filesystem.getRemoteStat(connectionId, r.remotePath).catch(() => null)),
				);
				resolved.forEach((r, i) => {
					r.stat = stats[i];
				});

				const toUpload: UploadItem[] = [];
				let bulkDecision: "overwrite" | "skip" | null = null;
				const state: { cancelled: boolean } = { cancelled: false };

				const filtered: ResolvedFile[] = [];
				for (const file of resolved) {
					const existing = useTransferStore.getState().findBySource(file.localPath);
					if (existing.length > 0) {
						const decision = await askDuplicate(file.entry.name);
						if (decision === "cancel") {
							state.cancelled = true;
							break;
						}
						if (decision === "restart") {
							for (const item of existing) {
								void window.api.filesystem.cancelTransfer(item.jobId, item.id);
							}
							filtered.push(file);
							continue;
						}
						continue;
					}
					filtered.push(file);
				}

				if (state.cancelled) {
					toast.info(t("transfer.upload.cancelled"));
					return;
				}

				for (let i = 0; i < filtered.length; i++) {
					const file = filtered[i];
					const remoteExists = file.stat?.exists === true;
					if (!remoteExists) {
						toUpload.push(buildItem(file));
						continue;
					}
					if (bulkDecision === "overwrite") {
						toUpload.push(buildItem(file));
						continue;
					}
					if (bulkDecision === "skip") continue;

					const remaining = filtered.length - i;
					const decision = await askOverwrite(file, remaining);
					if (decision === "cancel") {
						state.cancelled = true;
						break;
					}
					if (decision === "overwriteAll") {
						bulkDecision = "overwrite";
						toUpload.push(buildItem(file));
						continue;
					}
					if (decision === "skipAll") {
						bulkDecision = "skip";
						continue;
					}
					if (decision === "overwrite") {
						toUpload.push(buildItem(file));
					}
				}

				if (state.cancelled) {
					toast.info(t("transfer.upload.cancelled"));
					return;
				}
				if (toUpload.length === 0) {
					toast.info(t("transfer.upload.cancelled"));
					return;
				}

				try {
					const { jobId } = await window.api.filesystem.upload({ connectionId, items: toUpload });
					for (const item of toUpload) {
						useTransferStore.getState().handleProgress({
							jobId,
							id: item.id,
							connectionId,
							name:
								(item.localPath.includes("\\") ? item.localPath.split("\\") : item.localPath.split("/")).pop() ??
								item.localPath,
							source: item.localPath,
							target: item.remotePath,
							direction: "upload",
							totalBytes: item.size,
							transferredBytes: 0,
							status: "queued",
						});
					}
					toast.info(t("transfer.upload.started"));
				} catch (err) {
					logger.error("upload start failed", { error: err });
					toast.error(t(getErrorI18nKey(classifyError(err).code)));
				}
			} finally {
				uploadingRef.current = false;
			}
		},
		[askDuplicate, askOverwrite, connectionId, localBasePath, remoteBasePath, t],
	);

	return {
		startUpload,
		dialog: (
			<>
				{conflict !== null && (
					<OverwriteDialog
						open={true}
						fileName={conflict.current.entry.name}
						localPath={conflict.current.localPath}
						remotePath={conflict.current.remotePath}
						localSize={conflict.current.entry.size}
						localModified={conflict.current.entry.modified}
						remoteSize={conflict.current.stat?.size ?? 0}
						remoteModified={conflict.current.stat?.modified ?? ""}
						remaining={conflict.remaining}
						direction="upload"
						onResolve={handleDecision}
					/>
				)}
				{duplicate !== null && (
					<DuplicateDownloadDialog
						open={true}
						fileName={duplicate.fileName}
						direction="upload"
						onResolve={handleDuplicateDecision}
					/>
				)}
			</>
		),
	};
}
