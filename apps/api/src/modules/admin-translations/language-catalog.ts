export interface LanguageCatalogEntry {
  code: string;
  deeplTarget: string;
  label: string;
}

export const LANGUAGE_CATALOG: LanguageCatalogEntry[] = [
  { code: "es", label: "Español", deeplTarget: "ES" },
  { code: "en", label: "English", deeplTarget: "EN-GB" },
  { code: "fr", label: "Français", deeplTarget: "FR" },
  { code: "de", label: "Deutsch", deeplTarget: "DE" },
  { code: "it", label: "Italiano", deeplTarget: "IT" },
  { code: "pt", label: "Português", deeplTarget: "PT-PT" },
  { code: "nl", label: "Nederlands", deeplTarget: "NL" },
  { code: "pl", label: "Polski", deeplTarget: "PL" },
];

export function getLanguageCatalogEntry(code: string): LanguageCatalogEntry | undefined {
  return LANGUAGE_CATALOG.find((entry) => entry.code === code);
}
