import { useEffect, useState } from "react";
import { App } from "../App";
import { I18nProvider } from "../providers/I18nProvider";
import { useSettingsStore } from "../store/settings";
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
