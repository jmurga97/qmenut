import { useCallback, useState } from "react";

import type { LanguageCode, LanguageOption } from "~/shared/types/language";

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "es", label: "ES" },
  { value: "en", label: "EN" },
];

interface LanguageState {
  handleLanguageChange: (event: CustomEvent<{ value: string }>) => void;
  lang: LanguageCode;
  langLabel: string;
  langOptions: LanguageOption[];
}

function isLanguageCode(value: string): value is LanguageCode {
  return value === "es" || value === "en";
}

export function useLanguage(): LanguageState {
  const [lang, setLang] = useState<LanguageCode>("es");

  const handleLanguageChange = useCallback((event: CustomEvent<{ value: string }>) => {
    if (!isLanguageCode(event.detail.value)) {
      return;
    }

    setLang(event.detail.value);
  }, []);

  return {
    handleLanguageChange,
    lang,
    langLabel: "Idioma",
    langOptions: LANGUAGE_OPTIONS,
  };
}
