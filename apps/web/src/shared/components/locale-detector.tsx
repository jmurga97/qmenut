import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { useEffect } from "react";

import { matchSupportedLocale } from "~/lib/i18n/locale-matcher";

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

    const match = matchSupportedLocale(
      navigator.languages,
      availableLanguages.map((language) => language.code),
    );

    if (match && match !== defaultLanguage) {
      void navigate({
        to: ".",
        params: (prev) => ({ ...prev, locale: match }),
        search: (prev) => prev,
        replace: true,
      });
    }
  }, [availableLanguages, defaultLanguage, locale, navigate]);

  return null;
}
