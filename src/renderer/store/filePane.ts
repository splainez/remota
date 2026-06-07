import { LoggerFactory } from "@shared/lib/logger";
import { create } from "zustand";

const logger = LoggerFactory.init({ name: "renderer.store.filePane" });

const DEFAULT_LOCAL_SIZE = 50;

interface FilePaneState {
	sizes: Record<number, number>;
	loaded: boolean;
	load: () => Promise<void>;
	getLocalSize: (connectionId: number) => number;
	setLocalSize: (connectionId: number, localSize: number) => void;
	reset: () => void;
}

function persist(connectionId: number, localSize: number) {
	window.api.filePaneSize.set(connectionId, { localSize }).catch((error: unknown) => {
		logger.error("filePaneSize.set error", { connectionId, error });
	});
}

export const useFilePaneStore = create<FilePaneState>((set, get) => ({
	sizes: {},
	loaded: false,

	load: async () => {
		if (get().loaded) return;
		try {
			const all = await window.api.filePaneSize.getAll();
			if (get().loaded) return;
			const sizes: Record<number, number> = {};
			for (const [key, value] of Object.entries(all) as [string, { localSize: number }][]) {
				const id = Number(key);
				if (Number.isFinite(id)) {
					sizes[id] = value.localSize;
				}
			}
			set({ sizes, loaded: true });
		} catch (error: unknown) {
			logger.error("filePaneSize.load error", { error });
			if (!get().loaded) {
				set({ loaded: true });
			}
		}
	},

	getLocalSize: (connectionId) => {
		return get().sizes[connectionId] ?? DEFAULT_LOCAL_SIZE;
	},

	setLocalSize: (connectionId, localSize) => {
		const clamped = Math.min(90, Math.max(10, localSize));
		set((state) => ({ sizes: { ...state.sizes, [connectionId]: clamped } }));
		persist(connectionId, clamped);
	},

	reset: () => {
		set({ sizes: {}, loaded: false });
	},
}));
