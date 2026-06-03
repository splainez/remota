import { ThemeProviderContext } from "@renderer/components/ui/theme-context";
import { useContext } from "react";

export const useTheme = () => {
	const context = useContext(ThemeProviderContext);

	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}

	return context;
};
