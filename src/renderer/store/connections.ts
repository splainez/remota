import { LoggerFactory } from "@shared/lib/logger";
import type { Connection, NewConnection, ConnectionUpdate } from "@shared/types";
import { create } from "zustand";

const logger = LoggerFactory.init({ name: "renderer.store.connections" });

interface ConnectionsState {
	connections: Connection[];
	selectedId: number | null;
	loading: boolean;
	load: () => Promise<void>;
	create: (data: NewConnection) => Promise<Connection>;
	update: (data: ConnectionUpdate) => Promise<void>;
	remove: (id: number) => Promise<void>;
	select: (id: number | null) => void;
}

export const useConnectionsStore = create<ConnectionsState>((set, get) => ({
	connections: [],
	selectedId: null,
	loading: true,

	load: async () => {
		if (!get().loading && get().connections.length > 0) return;
		try {
			const list = await window.api.connections.list();
			set({ connections: list, loading: false });
		} catch (error: unknown) {
			logger.error("load failed", { error });
			set({ loading: false });
		}
	},

	create: async (data) => {
		const created = await window.api.connections.create(data);
		const list = await window.api.connections.list();
		set({ connections: list, selectedId: created.id });
		return created;
	},

	update: async (data) => {
		await window.api.connections.update(data);
		const list = await window.api.connections.list();
		set({ connections: list });
	},

	remove: async (id) => {
		await window.api.connections.delete(id);
		if (get().selectedId === id) {
			set({ selectedId: null });
		}
		const list = await window.api.connections.list();
		set({ connections: list });
	},

	select: (id) => {
		set({ selectedId: id });
	},
}));

export function getSelectedConnection(state: ConnectionsState): Connection | null {
	return state.connections.find((c) => c.id === state.selectedId) ?? null;
}
