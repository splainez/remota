import type { TransferItemStatus, TransferProgressEvent } from "@shared/transfer-types";
import { create } from "zustand";

export interface TransferItem {
	id: string;
	jobId: string;
	connectionId: number;
	name: string;
	source: string;
	target: string;
	direction: "download" | "upload";
	totalBytes: number;
	transferredBytes: number;
	status: TransferItemStatus;
	error?: string;
}

interface TransferState {
	byConnection: Partial<Record<number, TransferItem[]>>;
	handleProgress: (event: TransferProgressEvent) => void;
	clearCompleted: (connectionId: number) => void;
	clearAll: (connectionId: number) => void;
	removeItem: (id: string, connectionId: number) => void;
	reset: () => void;
	pendingCount: (connectionId: number) => number;
}

function upsert(list: TransferItem[], item: TransferItem): TransferItem[] {
	const idx = list.findIndex((i) => i.id === item.id);
	if (idx === -1) return [...list, item];
	const next = list.slice();
	next[idx] = item;
	return next;
}

export const useTransferStore = create<TransferState>((set, get) => ({
	byConnection: {},

	handleProgress: (event) => {
		const { connectionId, ...rest } = event;
		set((state) => {
			const list = state.byConnection[connectionId] ?? [];
			const next: TransferItem = {
				id: rest.id,
				jobId: rest.jobId,
				connectionId,
				name: rest.name,
				source: rest.source,
				target: rest.target,
				direction: rest.direction,
				totalBytes: rest.totalBytes,
				transferredBytes: rest.transferredBytes,
				status: rest.status,
				...(rest.error !== undefined ? { error: rest.error } : {}),
			};
			return { byConnection: { ...state.byConnection, [connectionId]: upsert(list, next) } };
		});
	},

	clearCompleted: (connectionId) => {
		set((state) => {
			const list = state.byConnection[connectionId] ?? [];
			return {
				byConnection: {
					...state.byConnection,
					[connectionId]: list.filter((i) => i.status !== "completed"),
				},
			};
		});
	},

	clearAll: (connectionId) => {
		set((state) => {
			const next: Record<number, TransferItem[]> = {};
			for (const [key, value] of Object.entries(state.byConnection)) {
				const id = Number(key);
				if (id !== connectionId && value !== undefined) {
					next[id] = value;
				}
			}
			return { byConnection: next };
		});
	},

	removeItem: (id, connectionId) => {
		set((state) => {
			const list = state.byConnection[connectionId];
			if (list === undefined) return state;
			const filtered = list.filter((i) => i.id !== id);
			if (filtered.length === list.length) return state;
			return { byConnection: { ...state.byConnection, [connectionId]: filtered } };
		});
	},

	reset: () => {
		set({ byConnection: {} });
	},

	pendingCount: (connectionId) => {
		const list = get().byConnection[connectionId] ?? [];
		return list.filter((i) => i.status === "queued" || i.status === "active").length;
	},
}));
