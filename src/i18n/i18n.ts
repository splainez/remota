import en from "./en.json";
import es from "./es.json";

export type TranslationKey = keyof typeof en;
type Translations = Record<TranslationKey, string>;

interface TranslationsAll {
	en: Translations;
	es: Translations;
}

const translations: TranslationsAll = { en, es };

export type LocaleAvailable = "en" | "es";

export function getTranslations(locale: LocaleAvailable): Translations {
	return translations[locale];
}
