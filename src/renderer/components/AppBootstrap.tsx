import { I18nProvider } from "@renderer/providers/I18nProvider";
import { router } from "@renderer/router";
import { useSettingsStore } from "@renderer/store/settings";
import { LoggerFactory } from "@shared/lib/logger";
import { RouterProvider } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ThemeProvider } from "./theme-provider";

const logger = LoggerFactory.init({ name: "renderer.AppBootstrap" });

export function AppBootstrap() {
	const { theme, load, setTheme } = useSettingsStore();
	const [ready, setReady] = useState(false);

	useEffect(() => {
		load()
			.then(() => {
				setReady(true);
			})
			.catch((error: unknown) => {
				logger.error("load failed", { error });
			});
	}, [load]);

	if (!ready) {
		return (
			<div className="flex h-screen items-center justify-center bg-background">
				<div className="text-muted-foreground">Loading...</div>
			</div>
		);
	}

	return (
		<ThemeProvider defaultTheme={theme} onThemeChange={setTheme}>
			<I18nProvider>
				<RouterProvider router={router} />
			</I18nProvider>
		</ThemeProvider>
	);
}
