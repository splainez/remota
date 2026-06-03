import { useCallback, useMemo } from "react";
import { getTranslations, type TranslationKey } from "../../i18n";
import { I18nContext } from "../contexts/i18n-context";
import { useSettingsStore } from "../store/settings";

interface I18nProviderProps {
	children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
	const locale = useSettingsStore((s) => s.locale);

	const t = useCallback(
		(key: TranslationKey): string => {
			return getTranslations()[key];
		},
		[locale],
	);

	const value = useMemo(() => ({ locale, t }), [locale, t]);

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
