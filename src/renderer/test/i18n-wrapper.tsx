import type { ReactNode } from "react";
import { I18nContext, type I18nContextValue } from "../contexts/i18n-context";
import { getTranslations, type TranslationKey } from "../../i18n";

export function I18nWrapper({ children, locale = "en" }: { children: ReactNode; locale?: string }) {
	const value: I18nContextValue = {
		locale: locale as I18nContextValue["locale"],
		t: (key: TranslationKey): string => getTranslations()[key],
	};

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
