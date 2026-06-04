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

export function translate(locale: LocaleAvailable, key: TranslationKey, params?: Record<string, string>): string {
	let text = translations[locale][key];
	if (params) {
		for (const [name, value] of Object.entries(params)) {
			text = text.replaceAll(`{${name}}`, value);
		}
	}
	return text;
}
