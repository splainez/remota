import { translate, type LocaleAvailable, type TranslationKey } from "@i18n/i18n";
import { I18nContext, type I18nContextValue } from "@renderer/contexts/i18n-context";
import type { ReactNode } from "react";

export function I18nWrapper({ children, locale = "en" }: { children: ReactNode; locale?: LocaleAvailable }) {
	const value: I18nContextValue = {
		locale,
		t: (key: TranslationKey, params?: Record<string, string>): string => translate(locale, key, params),
	};

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
