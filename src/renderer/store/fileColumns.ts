import type { FileColumnId } from "@shared/app-config-schema";
import { DEFAULT_VISIBLE_COLUMNS } from "@shared/app-config-schema";
import { LoggerFactory } from "@shared/lib/logger";
import { create } from "zustand";

const logger = LoggerFactory.init({ name: "renderer.store.fileColumns" });

interface FileColumnsState {
	visibleColumns: FileColumnId[];
	loaded: boolean;
	load: () => Promise<void>;
	setVisibleColumns: (columns: FileColumnId[]) => void;
	reset: () => void;
}

function persist(visibleColumns: FileColumnId[]) {
	window.api.fileColumns.set({ visibleColumns }).catch((error: unknown) => {
		logger.error("fileColumns.set error", { error });
	});
}

export const useFileColumnsStore = create<FileColumnsState>((set, get) => ({
	visibleColumns: DEFAULT_VISIBLE_COLUMNS,
	loaded: false,

	load: async () => {
		if (get().loaded) return;
		try {
			const data = await window.api.fileColumns.get();
			if (get().loaded) return;
			set({ visibleColumns: data.visibleColumns, loaded: true });
		} catch (error: unknown) {
			logger.error("fileColumns.load error", { error });
			if (!get().loaded) {
				set({ loaded: true });
			}
		}
	},

	setVisibleColumns: (visibleColumns) => {
		set({ visibleColumns });
		persist(visibleColumns);
	},

	reset: () => {
		set({ visibleColumns: DEFAULT_VISIBLE_COLUMNS, loaded: false });
	},
}));
