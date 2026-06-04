import { translate, type TranslationKey } from "@i18n/i18n";
import { I18nContext } from "@renderer/contexts/i18n-context";
import { useSettingsStore } from "@renderer/store/settings";
import { useCallback, useMemo } from "react";

interface I18nProviderProps {
	children: React.ReactNode;
}

export type TFunction = (key: TranslationKey, params?: Record<string, string>) => string;

export function I18nProvider({ children }: I18nProviderProps) {
	const locale = useSettingsStore((s) => s.locale);

	const t = useCallback<TFunction>(
		(key, params) => {
			return translate(locale, key, params);
		},
		[locale],
	);

	const value = useMemo(() => ({ locale, t }), [locale, t]);

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
