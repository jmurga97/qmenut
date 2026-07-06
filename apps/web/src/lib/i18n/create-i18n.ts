import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./resources/en.json";
import es from "./resources/es.json";

import type { i18n as I18nInstance } from "i18next";

// Spain is the launch market: "es" is the system-wide fallback for both UI chrome and
// the default tenant/menu language, independent of any per-tenant configuration.
export const DEFAULT_LOCALE = "es";

const resources = { en: { translation: en }, es: { translation: es } };

export const BUNDLED_LOCALES = Object.keys(resources) as (keyof typeof resources)[];

/** Maps any tenant-configured locale (e.g. "en-GB", "pt", "ca") to a bundled chrome locale. */
export function chromeLocale(locale: string | undefined): (typeof BUNDLED_LOCALES)[number] {
  const base = locale?.toLowerCase().split("-")[0];

  return (BUNDLED_LOCALES as string[]).includes(base ?? "")
    ? (base as (typeof BUNDLED_LOCALES)[number])
    : DEFAULT_LOCALE;
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
