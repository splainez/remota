import { useEffect, useState } from "react";
import { initLocale } from "../../i18n";
import { useSettingsStore } from "../store/settings";
import { ThemeProvider } from "./theme-provider";
import { App } from "../App";

export function AppBootstrap() {
	const { theme, locale, loaded, load, setTheme } = useSettingsStore();
	const [ready, setReady] = useState(false);

	useEffect(() => {
		void load().then(() => {
			setReady(true);
		});
	}, [load]);

	useEffect(() => {
		if (loaded) {
			initLocale(locale);
		}
	}, [loaded, locale]);

	if (!ready) {
		return (
			<div className="flex h-screen items-center justify-center bg-background">
				<div className="text-muted-foreground">Loading...</div>
			</div>
		);
	}

	return (
		<ThemeProvider defaultTheme={theme} onThemeChange={setTheme}>
			<App />
		</ThemeProvider>
	);
}
