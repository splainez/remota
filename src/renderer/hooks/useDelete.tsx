import { DeleteConfirmDialog, type DeleteDecision } from "@renderer/components/Dialogs/DeleteConfirmDialog";
import { LoggerFactory } from "@shared/lib/logger";
import { classifyError, getErrorI18nKey } from "@shared/sftp-error";
import type { FileEntry } from "@shared/types";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "./useI18n";

const logger = LoggerFactory.init({ name: "renderer.useDelete" });

interface ConfirmState {
	itemName: string;
	remaining: number;
}

export interface UseDeleteParams {
	panelType: "local" | "remote";
	connectionId: number;
	refresh: () => Promise<void>;
}

export interface UseDeleteResult {
	startDelete: (entries: FileEntry[]) => Promise<void>;
	dialog: React.ReactNode;
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

export function useDelete({ panelType, connectionId, refresh }: UseDeleteParams): UseDeleteResult {
	const { t } = useI18n();
	const [confirm, setConfirm] = useState<ConfirmState | null>(null);
	const resolveRef = useRef<((d: DeleteDecision) => void) | null>(null);
	const deletingRef = useRef(false);

	const askConfirm = useCallback((itemName: string, remaining: number): Promise<DeleteDecision> => {
		return new Promise<DeleteDecision>((resolve) => {
			resolveRef.current = resolve;
			setConfirm({ itemName, remaining });
		});
	}, []);

	const clearConfirm = useCallback(() => {
		setConfirm(null);
		resolveRef.current = null;
	}, []);

	const handleDecision = useCallback(
		(decision: DeleteDecision) => {
			const resolve = resolveRef.current;
			clearConfirm();
			resolve?.(decision);
		},
		[clearConfirm],
	);

	const startDelete = useCallback(
		async (entries: FileEntry[]): Promise<void> => {
			if (entries.length === 0) return;
			if (deletingRef.current) return;
			deletingRef.current = true;

			try {
				let flat: FileEntry[];
				try {
					if (panelType === "remote") {
						flat = await flattenEntries(entries, connectionId, new Set());
					} else {
						flat = entries;
					}
				} catch (err) {
					logger.error("flatten entries failed for delete", { error: err });
					toast.error(t(getErrorI18nKey(classifyError(err).code)));
					return;
				}

				if (flat.length === 0) return;

				let bulkDecision: "delete" | null = null;
				const state: { cancelled: boolean } = { cancelled: false };
				let failedCount = 0;

				for (let i = 0; i < flat.length; i++) {
					const entry = flat[i];
					const remaining = flat.length - i;

					if (bulkDecision === "delete") {
						// bulk decision active, skip dialog
					} else {
						const decision = await askConfirm(entry.name, remaining);
						if (decision === "cancel") {
							state.cancelled = true;
							break;
						}
						if (decision === "deleteAll") {
							bulkDecision = "delete";
						}
					}

					try {
						if (panelType === "remote") {
							await window.api.filesystem.remoteDelete(connectionId, entry.fullPath);
						} else {
							await window.api.filesystem.delete(entry.fullPath);
						}
					} catch (err) {
						failedCount++;
						logger.error("delete failed", { path: entry.fullPath, error: err });
						toast.error(t(getErrorI18nKey(classifyError(err).code)));
					}
				}

				if (state.cancelled) {
					return;
				}

				const succeeded = flat.length - failedCount;
				if (failedCount > 0 && succeeded > 0) {
					toast.warning(t("file.delete.partial", { count: String(failedCount) }));
				} else if (failedCount === 0) {
					if (flat.length === 1) {
						toast.success(t("file.delete.success"));
					} else {
						toast.success(t("file.delete.successMultiple"));
					}
				}

				await refresh();
			} finally {
				deletingRef.current = false;
			}
		},
		[askConfirm, connectionId, panelType, refresh, t],
	);

	return {
		startDelete,
		dialog:
			confirm !== null ? (
				<DeleteConfirmDialog
					open={true}
					itemName={confirm.itemName}
					remaining={confirm.remaining}
					onResolve={handleDecision}
				/>
			) : null,
	};
}
