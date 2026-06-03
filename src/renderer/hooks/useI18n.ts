import { I18nContext } from "@renderer/contexts/i18n-context";
import { useContext } from "react";

export function useI18n() {
	const ctx = useContext(I18nContext);
	if (!ctx) {
		throw new Error("useI18n must be used within an I18nProvider");
	}
	return ctx;
}
