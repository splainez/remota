import { LoggerFactory } from "@shared/lib/logger";
import { create } from "zustand";

const logger = LoggerFactory.init({ name: "renderer.store.transferPanel" });

interface TransferPanelState {
	visibility: Record<number, boolean>;
	loaded: boolean;
	load: () => Promise<void>;
	isVisible: (connectionId: number) => boolean;
	setVisible: (connectionId: number, visible: boolean) => void;
	toggle: (connectionId: number) => void;
	notifyTransferStarted: (connectionId: number) => void;
	reset: () => void;
}

function persist(connectionId: number, visible: boolean) {
	window.api.transferPanel.set(connectionId, { visible }).catch((error: unknown) => {
		logger.error("transferPanel.set error", { connectionId, error });
	});
}

export const useTransferPanelStore = create<TransferPanelState>((set, get) => ({
	visibility: {},
	loaded: false,

	load: async () => {
		if (get().loaded) return;
		try {
			const all = await window.api.transferPanel.getAll();
			if (get().loaded) return;
			const visibility: Record<number, boolean> = {};
			for (const [key, value] of Object.entries(all)) {
				const id = Number(key);
				if (Number.isFinite(id)) {
					visibility[id] = value.visible;
				}
			}
			set({ visibility, loaded: true });
		} catch (error: unknown) {
			logger.error("transferPanel.load error", { error });
			if (!get().loaded) {
				set({ loaded: true });
			}
		}
	},

	isVisible: (connectionId) => {
		return get().visibility[connectionId] ?? false;
	},

	setVisible: (connectionId, visible) => {
		set((state) => ({ visibility: { ...state.visibility, [connectionId]: visible } }));
		persist(connectionId, visible);
	},

	toggle: (connectionId) => {
		const next = !get().isVisible(connectionId);
		get().setVisible(connectionId, next);
	},

	notifyTransferStarted: (connectionId) => {
		const current = get().isVisible(connectionId);
		if (current) return;
		get().setVisible(connectionId, true);
	},

	reset: () => {
		set({ visibility: {}, loaded: false });
	},
}));
