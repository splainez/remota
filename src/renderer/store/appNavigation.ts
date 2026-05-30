import { create } from "zustand";
import type { Connection } from "../../shared/types";

export type AppView =
	| { view: "empty" }
	| { view: "connectionList" }
	| { view: "connectionDetail"; id: number }
	| { view: "connectionForm"; mode: "new" | "edit"; id?: number }
	| { view: "fileBrowser"; connection: Connection }
	| { view: "settings" };

interface AppNavigationStore {
	currentView: AppView;
	setView: (view: AppView) => void;
	openConnectionList: () => void;
	openConnectionDetail: (id: number) => void;
	openConnectionForm: (mode: "new" | "edit", id?: number) => void;
	openFileBrowser: (connection: Connection) => void;
	openSettings: () => void;
	goBack: () => void;
}

export const useAppNavigation = create<AppNavigationStore>((set) => ({
	currentView: { view: "connectionList" },

	setView: (view) => {
		set({ currentView: view });
	},

	openConnectionList: () => {
		set({ currentView: { view: "connectionList" } });
	},

	openConnectionDetail: (id) => {
		set({ currentView: { view: "connectionDetail", id } });
	},

	openConnectionForm: (mode, id) => {
		set({ currentView: { view: "connectionForm", mode, id } });
	},

	openFileBrowser: (connection) => {
		set({ currentView: { view: "fileBrowser", connection } });
	},

	openSettings: () => {
		set({ currentView: { view: "settings" } });
	},

	goBack: () => {
		set({ currentView: { view: "connectionList" } });
	},
}));
