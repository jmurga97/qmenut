import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import { matchSupportedLocale } from "./locale-matcher";
import ca from "./resources/ca";
import caValencia from "./resources/ca-valencia";
import de from "./resources/de";
import en from "./resources/en";
import es from "./resources/es";
import fr from "./resources/fr";
import gl from "./resources/gl";
import it from "./resources/it";
import nl from "./resources/nl";
import pl from "./resources/pl";
import pt from "./resources/pt";
import ru from "./resources/ru";
import uk from "./resources/uk";
import zh from "./resources/zh";

import type { i18n as I18nInstance } from "i18next";

// Spain is the launch market: "es" is the system-wide fallback for both UI chrome and
// the default tenant/menu language, independent of any per-tenant configuration.
export const DEFAULT_LOCALE = "es";

const resources = {
  ca: { translation: ca },
  "ca-valencia": { translation: caValencia },
  de: { translation: de },
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  gl: { translation: gl },
  it: { translation: it },
  nl: { translation: nl },
  pl: { translation: pl },
  pt: { translation: pt },
  ru: { translation: ru },
  uk: { translation: uk },
  zh: { translation: zh },
};

export const BUNDLED_LOCALES = Object.keys(resources) as (keyof typeof resources)[];

/** Maps any tenant-configured locale (e.g. "en-GB", "pt", "ca") to a bundled chrome locale. */
export function chromeLocale(locale: string | undefined): (typeof BUNDLED_LOCALES)[number] {
  return matchSupportedLocale(locale, BUNDLED_LOCALES) ?? DEFAULT_LOCALE;
}

/**
 * Creates a fresh i18next instance per SSR request (called from `getRouter()`), so no
 * translation state leaks across concurrent requests in the Workers runtime.
 */
export function createI18nInstance(locale: string | undefined): I18nInstance {
  const instance = createInstance();

  // Resources are bundled (no backend plugin), so init() completes synchronously —
  // the instance is ready before the first SSR render, no Suspense needed.
  void instance.use(initReactI18next).init({
    resources,
    lng: chromeLocale(locale),
    fallbackLng: DEFAULT_LOCALE,
    interpolation: { escapeValue: false },
  });

  return instance;
}
