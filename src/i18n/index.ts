import en from "./en.json";
import es from "./es.json";

const translations: Record<string, Record<string, string>> = { en, es };

let currentLocale = "en";

function detectLocale(): string {
  let lang = "en";
  try {
    lang = (navigator.language || Intl.DateTimeFormat().resolvedOptions().locale).slice(0, 2).toLowerCase();
  } catch {
    // fallback to en
  }
  return lang in translations ? lang : "en";
}

export function initLocale() {
  currentLocale = detectLocale();
}

export function setLocale(locale: string) {
  if (locale in translations) {
    currentLocale = locale;
  }
}

export function t(key: string): string {
  return (translations[currentLocale] ?? translations.en)[key] ?? key;
}
