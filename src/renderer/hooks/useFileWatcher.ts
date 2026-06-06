import { LoggerFactory } from "@shared/lib/logger";
import { useEffect, useId } from "react";

const logger = LoggerFactory.init({ name: "renderer.useFileWatcher" });

export function useFileWatcher(path: string, type: "local" | "remote", refresh: () => Promise<void>): void {
	const watcherId = useId();

	useEffect(() => {
		if (type !== "local") return;

		void window.api.filesystem.startWatch(watcherId, path).catch((error: unknown) => {
			logger.error("startWatch failed", { path, error });
		});

		const unsub = window.api.filesystem.onFileChanged((id) => {
			if (id !== watcherId) return;
			refresh().catch((error: unknown) => {
				logger.error("auto-refresh failed", { path, error });
			});
		});

		return () => {
			unsub();
			void window.api.filesystem.stopWatch(watcherId).catch((error: unknown) => {
				logger.error("stopWatch failed", { path, error });
			});
		};
	}, [path, type, refresh, watcherId]);
}
