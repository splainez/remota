import { App } from "@renderer/App";
import { I18nProvider } from "@renderer/providers/I18nProvider";
import { useSettingsStore } from "@renderer/store/settings";
import { useEffect, useState } from "react";

import { ThemeProvider } from "./theme-provider";

export function AppBootstrap() {
	const { theme, load, setTheme } = useSettingsStore();
	const [ready, setReady] = useState(false);

	useEffect(() => {
		void load().then(() => {
			setReady(true);
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
				<App />
			</I18nProvider>
		</ThemeProvider>
	);
}
