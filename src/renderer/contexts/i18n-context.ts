import type { LocaleAvailable, TranslationKey } from "@i18n/i18n";
import { createContext } from "react";

export interface I18nContextValue {
	locale: LocaleAvailable;
	t: (key: TranslationKey, params?: Record<string, string>) => string;
}

export const I18nContext = createContext<I18nContextValue | undefined>(undefined);
