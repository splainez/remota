import { createContext } from "react";
import type { LocaleAvailable, TranslationKey } from "@i18n/i18n";

export interface I18nContextValue {
	locale: LocaleAvailable;
	t: (key: TranslationKey) => string;
}

export const I18nContext = createContext<I18nContextValue | undefined>(undefined);
