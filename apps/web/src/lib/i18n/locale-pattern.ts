/** Locale syntax shared by route validation and edge-cache path classification. */
export const LOCALE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i;

const LANGUAGE_NAMES = new Intl.DisplayNames(["en"], { type: "language", fallback: "none" });

/** True for a real language (`bar` is Bavarian), false for path junk such as `/foo`. */
export function isLanguageTag(value: string): boolean {
  try {
    return LANGUAGE_NAMES.of(new Intl.Locale(value).language) !== undefined;
  } catch {
    return false;
  }
}
