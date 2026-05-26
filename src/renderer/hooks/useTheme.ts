import { useContext } from "react"
import { ThemeProviderContext } from "../components/ui/theme-context"

export const useTheme = () => {
	const context = useContext(ThemeProviderContext)

	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider")
	}

	return context
}
