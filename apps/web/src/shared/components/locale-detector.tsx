import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { useEffect } from "react";

const CHOICE_STORAGE_KEY = "qm-locale-choice";
const DETECTED_SESSION_KEY = "qm-locale-detected";

/**
 * Client-only, first-visit language detection. Unprefixed URLs are always served in the
 * tenant's default language (so `/` stays ISR-cacheable); if the browser's language matches
 * one of the tenant's *active* languages and differs from the default, this redirects once
 * after hydration. An explicit switcher choice (persisted in localStorage) always wins.
 */
export function LocaleDetector() {
  const navigate = useNavigate();
  const { availableLanguages, defaultLanguage, locale } = useRouteContext({ from: "/{-$locale}" });

  useEffect(() => {
    if (locale !== undefined) {
      return;
    }

    if (window.localStorage.getItem(CHOICE_STORAGE_KEY)) {
      return;
    }

    if (window.sessionStorage.getItem(DETECTED_SESSION_KEY)) {
      return;
    }

    window.sessionStorage.setItem(DETECTED_SESSION_KEY, "1");

    const activeCodes = new Set(availableLanguages.map((language) => language.code));
    const match = navigator.languages
      .map((browserLocale) => browserLocale.toLowerCase().split("-")[0])
      .find((code): code is string => code !== undefined && activeCodes.has(code));

    if (match && match !== defaultLanguage) {
      void navigate({ to: ".", params: (prev) => ({ ...prev, locale: match }), replace: true });
    }
  }, [availableLanguages, defaultLanguage, locale, navigate]);

  return null;
}
