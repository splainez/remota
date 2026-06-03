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

let currentLocale: LocaleAvailable = "en";

function detectLocale(): LocaleAvailable {
	let lang = "en";
	try {
		lang = (navigator.language || Intl.DateTimeFormat().resolvedOptions().locale).slice(0, 2).toLowerCase();
	} catch {
		// fallback to en
	}
	return lang === "es" ? lang : "en";
}

export function initLocale(locale?: LocaleAvailable) {
	currentLocale = locale ?? detectLocale();
}

export function setLocale(locale: LocaleAvailable) {
	if (locale in translations) {
		currentLocale = locale;
	}
}

export function getLocale(): LocaleAvailable {
	return currentLocale;
}

export function getTranslations(): Translations {
	return translations[currentLocale];
}
