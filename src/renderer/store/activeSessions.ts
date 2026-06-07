import { LoggerFactory } from "@shared/lib/logger";
import { create } from "zustand";

import { useSettingsStore } from "./settings";

const logger = LoggerFactory.init({ name: "renderer.store.activeSessions" });

export interface ActiveSession {
	connectionId: number;
	connectedAt: number;
}

interface ActiveSessionsState {
	sessions: ActiveSession[];
	addSession: (connectionId: number) => void;
	removeSession: (connectionId: number) => void;
	hasSession: (connectionId: number) => boolean;
	loadFromBackend: () => Promise<void>;
}

export const useActiveSessionsStore = create<ActiveSessionsState>((set, get) => ({
	sessions: [],

	addSession: (connectionId) => {
		const { sessions } = get();
		if (sessions.some((s) => s.connectionId === connectionId)) return;

		const maxSessions = useSettingsStore.getState().maxSessions;
		if (maxSessions > 0 && sessions.length >= maxSessions) {
			logger.warn("max sessions reached", { max: maxSessions, current: sessions.length });
			return;
		}

		set({ sessions: [...sessions, { connectionId, connectedAt: Date.now() }] });
	},

	removeSession: (connectionId) => {
		set((state) => ({
			sessions: state.sessions.filter((s) => s.connectionId !== connectionId),
		}));
	},

	hasSession: (connectionId) => {
		return get().sessions.some((s) => s.connectionId === connectionId);
	},

	loadFromBackend: async () => {
		const { sessions } = get();
		if (sessions.length === 0) return;

		const results = await Promise.all(
			sessions.map(async (session) => ({
				id: session.connectionId,
				connected: await window.api.filesystem.remoteIsConnected(session.connectionId).catch(() => false),
			})),
		);

		const validIds = new Set(results.filter((r) => r.connected).map((r) => r.id));
		const cleaned = sessions.filter((s) => validIds.has(s.connectionId));

		if (cleaned.length !== sessions.length) {
			logger.info("cleaned orphaned sessions", {
				before: sessions.length,
				after: cleaned.length,
			});
			set({ sessions: cleaned });
		}
	},
}));
