import { create } from "zustand";

interface PaneHistory {
	entries: string[];
	index: number;
}

interface NavigationStore {
	panes: Record<"local" | "remote", PaneHistory>;
	push: (type: "local" | "remote", path: string) => void;
	goBack: (type: "local" | "remote") => string | null;
	goForward: (type: "local" | "remote") => string | null;
	canGoBack: (type: "local" | "remote") => boolean;
	canGoForward: (type: "local" | "remote") => boolean;
	clear: (type: "local" | "remote") => void;
}

function emptyPane(): PaneHistory {
	return { entries: [], index: -1 };
}

export const useNavigationStore = create<NavigationStore>((set, get) => ({
	panes: { local: emptyPane(), remote: emptyPane() },

	push: (type, path) => {
		set((state) => {
			const pane = { ...state.panes[type] };
			if (pane.index < pane.entries.length - 1) {
				pane.entries = pane.entries.slice(0, pane.index + 1);
			}
			pane.entries.push(path);
			pane.index = pane.entries.length - 1;
			return { panes: { ...state.panes, [type]: pane } };
		});
	},

	goBack: (type) => {
		const pane = get().panes[type];
		if (pane.index <= 0) return null;
		const newIndex = pane.index - 1;
		set((state) => ({
			panes: {
				...state.panes,
				[type]: { ...state.panes[type], index: newIndex },
			},
		}));
		return pane.entries[newIndex];
	},

	goForward: (type) => {
		const pane = get().panes[type];
		if (pane.index >= pane.entries.length - 1) return null;
		const newIndex = pane.index + 1;
		set((state) => ({
			panes: {
				...state.panes,
				[type]: { ...state.panes[type], index: newIndex },
			},
		}));
		return pane.entries[newIndex];
	},

	canGoBack: (type) => {
		return get().panes[type].index > 0;
	},

	canGoForward: (type) => {
		const pane = get().panes[type];
		return pane.index < pane.entries.length - 1;
	},

	clear: (type) => {
		set((state) => ({
			panes: { ...state.panes, [type]: emptyPane() },
		}));
	},
}));
