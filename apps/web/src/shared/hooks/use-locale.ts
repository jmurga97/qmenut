import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import type { QmLangOption } from "@qmenut/ui";

const CHOICE_STORAGE_KEY = "qm-locale-choice";

interface LocaleState {
  handleLanguageChange: (event: CustomEvent<{ value: string }>) => void;
  lang: string;
  langLabel: string;
  langOptions: QmLangOption[];
}

export function useLocale(): LocaleState {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { availableLanguages, defaultLanguage, effectiveLocale } = useRouteContext({ from: "/{-$locale}" });

  const handleLanguageChange = useCallback(
    (event: CustomEvent<{ value: string }>) => {
      const value = event.detail.value;

      window.localStorage.setItem(CHOICE_STORAGE_KEY, value);

      void navigate({
        to: ".",
        params: (prev) => ({ ...prev, locale: value === defaultLanguage ? undefined : value }),
      });
    },
    [defaultLanguage, navigate],
  );

  return {
    handleLanguageChange,
    lang: effectiveLocale,
    langLabel: t("common.languageLabel"),
    langOptions: availableLanguages.map((language) => ({
      value: language.code,
      label: language.code.toUpperCase(),
    })),
  };
}
