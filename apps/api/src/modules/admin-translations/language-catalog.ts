export interface LanguageCatalogEntry {
  code: string;
  deeplTarget: string | null;
  label: string;
}

// Valencian uses DeepL's Catalan target; its regional wording can be corrected in the editor.
export const LANGUAGE_CATALOG: LanguageCatalogEntry[] = [
  { code: "es", label: "Español", deeplTarget: "ES" },
  { code: "en", label: "English", deeplTarget: "EN-GB" },
  { code: "fr", label: "Français", deeplTarget: "FR" },
  { code: "de", label: "Deutsch", deeplTarget: "DE" },
  { code: "it", label: "Italiano", deeplTarget: "IT" },
  { code: "pt", label: "Português", deeplTarget: "PT-PT" },
  { code: "nl", label: "Nederlands", deeplTarget: "NL" },
  { code: "pl", label: "Polski", deeplTarget: "PL" },
  { code: "ca", label: "Català", deeplTarget: "CA" },
  { code: "ca-valencia", label: "Valencià", deeplTarget: "CA" },
  { code: "gl", label: "Galego", deeplTarget: "GL" },
  { code: "zh", label: "中文（普通话）", deeplTarget: "ZH" },
  { code: "ru", label: "Русский", deeplTarget: "RU" },
  { code: "uk", label: "Українська", deeplTarget: "UK" },
];

export function getLanguageCatalogEntry(code: string): LanguageCatalogEntry | undefined {
  return LANGUAGE_CATALOG.find((entry) => entry.code === code);
}
