import { DuplicateDownloadDialog, type DuplicateDecision } from "@renderer/components/Dialogs/DuplicateDownloadDialog";
import { OverwriteDialog, type OverwriteDecision } from "@renderer/components/Dialogs/OverwriteDialog";
import { join as joinPath } from "@renderer/shared/path-utils";
import { useTransferStore } from "@renderer/store/transfer";
import { useTransferPanelStore } from "@renderer/store/transferPanel";
import { LoggerFactory } from "@shared/lib/logger";
import { classifyError, getErrorI18nKey } from "@shared/sftp-error";
import type { DownloadItem, FileEntry, LocalStat } from "@shared/types";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "./useI18n";

const logger = LoggerFactory.init({ name: "renderer.useDownload" });

interface ResolvedFile {
	entry: FileEntry;
	remotePath: string;
	localPath: string;
	stat: LocalStat | null;
}

interface ConflictState {
	current: ResolvedFile;
	remaining: number;
}

interface DuplicateState {
	fileName: string;
}

export interface UseDownloadParams {
	connectionId: number;
	localBasePath: string;
	remoteBasePath: string;
}

export interface UseDownloadResult {
	startDownload: (entries: FileEntry[]) => Promise<void>;
	dialog: React.ReactNode;
}

let idCounter = 0;

function newId(): string {
	idCounter += 1;
	return `dl-${String(Date.now())}-${String(idCounter)}`;
}

function relativeRemotePath(absolute: string, base: string): string {
	if (absolute === base) return "";
	const normalizedBase = base.endsWith("/") ? base : `${base}/`;
	if (absolute.startsWith(normalizedBase)) {
		return absolute.slice(normalizedBase.length);
	}
	return absolute.replace(/^\/+/, "");
}

async function flattenEntries(entries: FileEntry[], connectionId: number, visited: Set<string>): Promise<FileEntry[]> {
	const out: FileEntry[] = [];
	for (const entry of entries) {
		if (!entry.isDirectory) {
			out.push(entry);
			continue;
		}
		const subPath = entry.fullPath;
		if (visited.has(subPath)) continue;
		visited.add(subPath);
		const childList = await window.api.filesystem.remoteList(connectionId, subPath);
		const sub = await flattenEntries(childList, connectionId, visited);
		out.push(...sub);
	}
	return out;
}

function buildItem(file: ResolvedFile): DownloadItem {
	return {
		id: newId(),
		remotePath: file.remotePath,
		localPath: file.localPath,
		remoteModified: file.entry.modified,
		size: file.entry.size,
	};
}

export function useDownload({ connectionId, localBasePath, remoteBasePath }: UseDownloadParams): UseDownloadResult {
	const { t } = useI18n();
	const [conflict, setConflict] = useState<ConflictState | null>(null);
	const [duplicate, setDuplicate] = useState<DuplicateState | null>(null);
	const resolveRef = useRef<((d: OverwriteDecision) => void) | null>(null);
	const resolveDuplicateRef = useRef<((d: DuplicateDecision) => void) | null>(null);
	const downloadingRef = useRef(false);

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

	const startDownload = useCallback(
		async (entries: FileEntry[]): Promise<void> => {
			if (entries.length === 0) return;
			if (downloadingRef.current) return;
			downloadingRef.current = true;

			try {
				useTransferPanelStore.getState().notifyTransferStarted(connectionId);

				let flat: FileEntry[];
				try {
					flat = await flattenEntries(entries, connectionId, new Set());
				} catch (err) {
					logger.error("flatten entries failed", { error: err });
					toast.error(t(getErrorI18nKey(classifyError(err).code)));
					return;
				}
				if (flat.length === 0) return;

				const resolved: ResolvedFile[] = flat.map((entry) => {
					const rel = relativeRemotePath(entry.fullPath, remoteBasePath);
					const localPath = joinPath(localBasePath, rel);
					return { entry, remotePath: entry.fullPath, localPath, stat: null };
				});

				const stats = await Promise.all(
					resolved.map((r) => window.api.filesystem.getLocalStat(r.localPath).catch(() => null)),
				);
				resolved.forEach((r, i) => {
					r.stat = stats[i];
				});

				const toDownload: DownloadItem[] = [];
				let bulkDecision: "overwrite" | "skip" | null = null;
				const state: { cancelled: boolean } = { cancelled: false };

				const filtered: ResolvedFile[] = [];
				for (const file of resolved) {
					const existing = useTransferStore.getState().findBySource(file.remotePath);
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
					toast.info(t("transfer.download.cancelled"));
					return;
				}

				for (let i = 0; i < filtered.length; i++) {
					const file = filtered[i];
					const localExists = file.stat?.exists === true;
					if (!localExists) {
						toDownload.push(buildItem(file));
						continue;
					}
					if (bulkDecision === "overwrite") {
						toDownload.push(buildItem(file));
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
						toDownload.push(buildItem(file));
						continue;
					}
					if (decision === "skipAll") {
						bulkDecision = "skip";
						continue;
					}
					if (decision === "overwrite") {
						toDownload.push(buildItem(file));
					}
				}

				if (state.cancelled) {
					toast.info(t("transfer.download.cancelled"));
					return;
				}
				if (toDownload.length === 0) {
					toast.info(t("transfer.download.cancelled"));
					return;
				}

				try {
					const { jobId } = await window.api.filesystem.download({ connectionId, items: toDownload });
					for (const item of toDownload) {
						useTransferStore.getState().handleProgress({
							jobId,
							id: item.id,
							connectionId,
							name: item.remotePath.split("/").pop() ?? item.remotePath,
							source: item.remotePath,
							target: item.localPath,
							direction: "download",
							totalBytes: item.size,
							transferredBytes: 0,
							status: "queued",
						});
					}
					toast.info(t("transfer.download.started"));
				} catch (err) {
					logger.error("download start failed", { error: err });
					toast.error(t(getErrorI18nKey(classifyError(err).code)));
				}
			} finally {
				downloadingRef.current = false;
			}
		},
		[askDuplicate, askOverwrite, connectionId, localBasePath, remoteBasePath, t],
	);

	return {
		startDownload,
		dialog: (
			<>
				{conflict !== null && (
					<OverwriteDialog
						open={true}
						fileName={conflict.current.entry.name}
						localPath={conflict.current.localPath}
						remotePath={conflict.current.remotePath}
						localSize={conflict.current.stat?.exists === true ? conflict.current.stat.size : null}
						localModified={conflict.current.stat?.exists === true ? conflict.current.stat.modified : null}
						remoteSize={conflict.current.entry.size}
						remoteModified={conflict.current.entry.modified}
						remaining={conflict.remaining}
						onResolve={handleDecision}
					/>
				)}
				{duplicate !== null && (
					<DuplicateDownloadDialog open={true} fileName={duplicate.fileName} onResolve={handleDuplicateDecision} />
				)}
			</>
		),
	};
}
