import { translate } from "@i18n/i18n";
import { LoggerFactory } from "@shared/lib/logger";
import { toast } from "sonner";
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
}

export const useActiveSessionsStore = create<ActiveSessionsState>((set, get) => ({
	sessions: [],

	addSession: (connectionId) => {
		const { sessions } = get();
		if (sessions.some((s) => s.connectionId === connectionId)) return;

		const maxSessions = useSettingsStore.getState().maxSessions;
		if (maxSessions > 0 && sessions.length >= maxSessions) {
			logger.warn("max sessions reached", { max: maxSessions, current: sessions.length });
			const locale = useSettingsStore.getState().locale;
			toast.warning(translate(locale, "connection.sessionLimit", { max: String(maxSessions) }));
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
}));
