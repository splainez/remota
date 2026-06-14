import { LoggerFactory } from "@shared/lib/logger";
import { app } from "electron";

import type { AppStore } from "./app-store";

const log = LoggerFactory.init({ name: "jump-list" });

export function updateJumpList(store: AppStore) {
	if (process.platform !== "win32") return;

	const exePath = store.getExePath();
	if (!exePath) return;

	const recentIds = store.getRecentConnections();
	const connections = store.list();

	const items: Electron.JumpListItem[] = [];

	for (const id of recentIds) {
		const conn = connections.find((c) => c.id === id);
		if (!conn) continue;
		items.push({
			type: "task",
			title: conn.name,
			program: exePath,
			args: `--connect=${String(conn.id)}`,
			iconPath: exePath,
			iconIndex: 0,
		});
	}

	const settings = app.getJumpListSettings();
	const removedSet = new Set(settings.removedItems.map((item) => item.title));
	const filtered = items.filter((item) => !removedSet.has(item.title));

	const jumpList: Electron.JumpListCategory[] = [
		{
			type: "custom",
			name: "Recent",
			items: filtered,
		},
		{
			type: "tasks",
			items: [
				{
					type: "task",
					title: "Remota",
					program: exePath,
					iconPath: exePath,
					iconIndex: 0,
				},
			],
		},
	];

	try {
		app.setJumpList(jumpList);
	} catch (err) {
		log.error("Failed to set jump list", { err });
	}
}
