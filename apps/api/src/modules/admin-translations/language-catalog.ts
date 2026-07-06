export interface LanguageCatalogEntry {
  code: string;
  deeplTarget: string | null;
  label: string;
}

// `deeplTarget: null` means the language can still be added and edited manually, but
// `translations.translateAll` cannot auto-translate into it (DeepL has no such target).
export const LANGUAGE_CATALOG: LanguageCatalogEntry[] = [
  { code: "es", label: "Español", deeplTarget: "ES" },
  { code: "en", label: "English", deeplTarget: "EN-GB" },
  { code: "fr", label: "Français", deeplTarget: "FR" },
  { code: "de", label: "Deutsch", deeplTarget: "DE" },
  { code: "it", label: "Italiano", deeplTarget: "IT" },
  { code: "pt", label: "Português", deeplTarget: "PT-PT" },
  { code: "nl", label: "Nederlands", deeplTarget: "NL" },
  { code: "pl", label: "Polski", deeplTarget: "PL" },
  { code: "ca", label: "Català", deeplTarget: null },
  { code: "eu", label: "Euskara", deeplTarget: null },
  { code: "gl", label: "Galego", deeplTarget: null },
];

export function getLanguageCatalogEntry(code: string): LanguageCatalogEntry | undefined {
  return LANGUAGE_CATALOG.find((entry) => entry.code === code);
}
