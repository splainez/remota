import { LoggerFactory } from "@shared/lib/logger";
import type { Connection, NewConnection, ConnectionUpdate } from "@shared/types";
import { create } from "zustand";

const logger = LoggerFactory.init({ name: "renderer.store.connections" });

interface ConnectionsState {
	connections: Connection[];
	selectedId: number | null;
	loaded: boolean;
	load: () => Promise<void>;
	create: (data: NewConnection) => Promise<Connection>;
	update: (data: ConnectionUpdate) => Promise<void>;
	remove: (id: number) => Promise<void>;
	select: (id: number | null) => void;
}

let loadPending: Promise<void> | null = null;

export const useConnectionsStore = create<ConnectionsState>((set, get) => ({
	connections: [],
	selectedId: null,
	loaded: false,

	load: async () => {
		if (get().loaded) return;
		if (loadPending) return loadPending;

		loadPending = (async () => {
			try {
				const list = await window.api.connections.list();
				set({ connections: list, loaded: true });
			} catch (error: unknown) {
				logger.error("load failed", { error });
				set({ loaded: false });
			} finally {
				loadPending = null;
			}
		})();

		return loadPending;
	},

	create: async (data) => {
		const created = await window.api.connections.create(data);
		try {
			const list = await window.api.connections.list();
			set({ connections: list, selectedId: created.id });
		} catch (error: unknown) {
			logger.error("refresh after create failed, using optimistic update", { error });
			set((state) => ({
				connections: [...state.connections, created],
				selectedId: created.id,
			}));
		}
		return created;
	},

	update: async (data) => {
		await window.api.connections.update(data);
		try {
			const list = await window.api.connections.list();
			set({ connections: list });
		} catch (error: unknown) {
			logger.error("refresh after update failed, using optimistic update", { error });
			set((state) => ({
				connections: state.connections.map((c) => (c.id === data.id ? { ...c, ...data } : c)),
			}));
		}
	},

	remove: async (id) => {
		await window.api.connections.delete(id);
		if (get().selectedId === id) {
			set({ selectedId: null });
		}
		try {
			const list = await window.api.connections.list();
			set({ connections: list });
		} catch (error: unknown) {
			logger.error("refresh after remove failed, using optimistic update", { error });
			set((state) => ({
				connections: state.connections.filter((c) => c.id !== id),
			}));
		}
	},

	select: (id) => {
		set({ selectedId: id });
	},
}));

export function getSelectedConnection(state: ConnectionsState): Connection | null {
	return state.connections.find((c) => c.id === state.selectedId) ?? null;
}
