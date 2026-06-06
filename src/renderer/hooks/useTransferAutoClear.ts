import { useSettingsStore } from "@renderer/store/settings";
import { useTransferStore } from "@renderer/store/transfer";
import type { TransferItemStatus } from "@shared/transfer-types";
import { useEffect, useRef } from "react";

const TERMINAL_STATUSES: ReadonlySet<TransferItemStatus> = new Set(["completed", "failed", "cancelled"]);

export function useTransferAutoClear(connectionId: number): void {
	const retentionMs = useSettingsStore((s) => s.retentionMs);
	const rawItems = useTransferStore((s) => s.byConnection[connectionId]);
	const items = rawItems ?? [];
	const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

	useEffect(() => {
		const pending = timersRef.current;

		for (const [itemId, timerId] of pending) {
			const stillExists = items.some((i) => i.id === itemId);
			if (!stillExists) {
				clearTimeout(timerId);
				pending.delete(itemId);
			}
		}

		if (retentionMs === undefined) return;

		for (const item of items) {
			if (!TERMINAL_STATUSES.has(item.status)) continue;
			if (pending.has(item.id)) continue;

			const timerId = setTimeout(() => {
				useTransferStore.getState().removeItem(item.id, connectionId);
				pending.delete(item.id);
			}, retentionMs);

			pending.set(item.id, timerId);
		}
	}, [items, connectionId, retentionMs]);

	useEffect(() => {
		return () => {
			for (const timerId of timersRef.current.values()) {
				clearTimeout(timerId);
			}
			timersRef.current.clear();
		};
	}, []);
}
