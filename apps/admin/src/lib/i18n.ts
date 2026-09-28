import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import en from "~/lib/locales/en/translation.json";
import es from "~/lib/locales/es/translation.json";

const SUPPORTED_LOCALES = ["en", "es"] as const;
const DEFAULT_LOCALE = "es";

function detectLocale(): (typeof SUPPORTED_LOCALES)[number] {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;

  const preferences = navigator.languages.length > 0 ? navigator.languages : [navigator.language];
  for (const preference of preferences) {
    const language = preference.toLowerCase().split("-")[0];
    if (SUPPORTED_LOCALES.includes(language as (typeof SUPPORTED_LOCALES)[number])) {
      return language as (typeof SUPPORTED_LOCALES)[number];
    }
  }

  return DEFAULT_LOCALE;
}

export const i18n = createInstance();

// Resources are bundled, so init resolves synchronously and boot never waits on a network round-trip.
await i18n.use(initReactI18next).init({
  defaultNS: "translation",
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
  keySeparator: "___",
  lng: detectLocale(),
  // Keys are natural-language copy that may contain ":"; never split them into namespaces.
  nsSeparator: false,
  resources: { en: { translation: en }, es: { translation: es } },
  supportedLngs: [...SUPPORTED_LOCALES],
});

const locale = i18n.resolvedLanguage ?? DEFAULT_LOCALE;
document.documentElement.lang = locale;
document.title = i18n.t("common___documentTitle");
