import React from "react";

import { ThemeProviderContext, type Theme } from "./ui/theme-context";

type ResolvedTheme = "dark" | "light";

interface ThemeProviderProps {
	children: React.ReactNode;
	defaultTheme?: Theme;
	disableTransitionOnChange?: boolean;
	onThemeChange?: (theme: Theme) => void;
}

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";

function getSystemTheme(): ResolvedTheme {
	if (window.matchMedia(COLOR_SCHEME_QUERY).matches) {
		return "dark";
	}

	return "light";
}

function disableTransitionsTemporarily() {
	const style = document.createElement("style");
	style.appendChild(
		document.createTextNode("*,*::before,*::after{-webkit-transition:none!important;transition:none!important}"),
	);
	document.head.appendChild(style);

	return () => {
		window.getComputedStyle(document.body);
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				style.remove();
			});
		});
	};
}

function isEditableTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) {
		return false;
	}

	if (target.isContentEditable) {
		return true;
	}

	const editableParent = target.closest("input, textarea, select, [contenteditable='true']");
	if (editableParent) {
		return true;
	}

	return false;
}

export function ThemeProvider({
	children,
	defaultTheme = "dark",
	disableTransitionOnChange = true,
	onThemeChange,
	...props
}: ThemeProviderProps) {
	const [theme, setThemeState] = React.useState<Theme>(defaultTheme);

	const setTheme = React.useCallback(
		(nextTheme: Theme) => {
			setThemeState(nextTheme);
			onThemeChange?.(nextTheme);
		},
		[onThemeChange],
	);

	const applyTheme = React.useCallback(
		(nextTheme: Theme) => {
			const root = document.documentElement;
			const resolvedTheme = nextTheme === "system" ? getSystemTheme() : nextTheme;
			const restoreTransitions = disableTransitionOnChange ? disableTransitionsTemporarily() : null;

			root.classList.remove("light", "dark");
			root.classList.add(resolvedTheme);

			if (restoreTransitions) {
				restoreTransitions();
			}
		},
		[disableTransitionOnChange],
	);

	React.useEffect(() => {
		applyTheme(theme);

		if (theme !== "system") {
			return undefined;
		}

		const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY);
		const handleChange = () => {
			applyTheme("system");
		};

		mediaQuery.addEventListener("change", handleChange);

		return () => {
			mediaQuery.removeEventListener("change", handleChange);
		};
	}, [theme, applyTheme]);

	React.useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.repeat) {
				return;
			}

			if (event.metaKey || event.ctrlKey || event.altKey) {
				return;
			}

			if (isEditableTarget(event.target)) {
				return;
			}

			if (event.key.toLowerCase() !== "d") {
				return;
			}

			setThemeState((currentTheme) => {
				const nextTheme =
					currentTheme === "dark"
						? "light"
						: currentTheme === "light"
							? "dark"
							: getSystemTheme() === "dark"
								? "light"
								: "dark";

				onThemeChange?.(nextTheme);
				return nextTheme;
			});
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [onThemeChange]);

	const value = React.useMemo(
		() => ({
			theme,
			setTheme,
		}),
		[theme, setTheme],
	);

	return (
		<ThemeProviderContext.Provider {...props} value={value}>
			{children}
		</ThemeProviderContext.Provider>
	);
}
