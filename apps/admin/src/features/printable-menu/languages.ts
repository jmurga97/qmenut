export const PRINTABLE_LANGUAGE_LABELS: Record<string, string> = {
  ca: "Català",
  de: "Deutsch",
  en: "English",
  es: "Español",
  eu: "Euskara",
  fr: "Français",
  gl: "Galego",
  it: "Italiano",
  nl: "Nederlands",
  pl: "Polski",
  pt: "Português",
};

export function getPrintableLanguageLabel(code: string): string {
  return PRINTABLE_LANGUAGE_LABELS[code] ?? code.toUpperCase();
}
