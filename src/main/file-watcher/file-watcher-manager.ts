import { watch, type FSWatcher } from "node:fs";

import { LoggerFactory } from "@shared/lib/logger";
import type { BrowserWindow } from "electron";

const logger = LoggerFactory.init({ name: "main.fileWatcher" });

const DEBOUNCE_MS = 300;

interface WatcherEntry {
	watcher: FSWatcher;
	timer: ReturnType<typeof setTimeout> | null;
}

export class FileWatcherManager {
	private watchers = new Map<string, WatcherEntry>();
	private readonly webContents: BrowserWindow["webContents"];

	constructor(webContents: BrowserWindow["webContents"]) {
		this.webContents = webContents;
	}

	start(watcherId: string, dirPath: string): void {
		this.stop(watcherId);

		try {
			const watcher = watch(dirPath, { recursive: false }, () => {
				const entry = this.watchers.get(watcherId);
				if (!entry) return;

				if (entry.timer) {
					clearTimeout(entry.timer);
				}

				entry.timer = setTimeout(() => {
					entry.timer = null;
					if (!this.watchers.has(watcherId)) return;
					if (this.webContents.isDestroyed()) return;
					this.webContents.send("file:changed", watcherId);
				}, DEBOUNCE_MS);
			});

			watcher.on("error", (err) => {
				logger.error("watcher error", { watcherId, dirPath, error: err.message });
				this.stop(watcherId);
			});

			this.watchers.set(watcherId, { watcher, timer: null });
		} catch (err) {
			logger.error("failed to start watcher", { watcherId, dirPath, error: String(err) });
		}
	}

	stop(watcherId: string): void {
		const entry = this.watchers.get(watcherId);
		if (!entry) return;

		if (entry.timer) {
			clearTimeout(entry.timer);
		}
		entry.watcher.close();
		this.watchers.delete(watcherId);
	}

	stopAll(): void {
		for (const [watcherId, entry] of this.watchers) {
			if (entry.timer) {
				clearTimeout(entry.timer);
			}
			entry.watcher.close();
			this.watchers.delete(watcherId);
		}
	}
}
