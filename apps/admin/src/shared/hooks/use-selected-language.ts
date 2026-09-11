import { useSuspenseQuery } from "@tanstack/react-query";

import { trpc } from "~/lib/trpc";
import { getLanguagesQueryOptions } from "~/shared/api";
import { useLanguageStore } from "~/shared/stores/language-store";

export function useSelectedLanguage() {
  const { data: languages } = useSuspenseQuery(getLanguagesQueryOptions({ trpc }));
  const selectedLanguageCode = useLanguageStore((state) => state.selectedLanguageCode);
  const current =
    languages.languages.find(({ languageCode }) => languageCode === selectedLanguageCode) ?? languages.languages[0];
  return { isDefault: current?.isDefault ?? true, languageCode: current?.languageCode ?? null };
}
