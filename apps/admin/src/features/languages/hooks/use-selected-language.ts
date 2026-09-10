import { useSuspenseQuery } from "@tanstack/react-query";

import { useLanguageStore } from "~/app/store/language-store";
import { getLanguagesQueryOptions } from "~/features/languages/api";
import { trpc } from "~/lib/trpc";

export function useSelectedLanguage() {
  const { data: languages } = useSuspenseQuery(getLanguagesQueryOptions({ trpc }));
  const selectedLanguageCode = useLanguageStore((state) => state.selectedLanguageCode);
  const current =
    languages.languages.find(({ languageCode }) => languageCode === selectedLanguageCode) ?? languages.languages[0];
  return { isDefault: current?.isDefault ?? true, languageCode: current?.languageCode ?? null };
}
