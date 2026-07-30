import type { PublicMenuLanguage } from "~/features/menu/api/public-menu-types";

export interface HreflangAlternate {
  hreflang: string;
  href: string;
}

interface BuildHreflangAlternatesInput {
  allowedLocales?: readonly string[];
  language: PublicMenuLanguage;
  origin: string;
  /** Locale-independent path suffix, e.g. "/" for the menu route or "/contacto". */
  path: string;
}

/**
 * The `/{-$locale}` prefix is only ever the tenant's active languages (`language.available`),
 * not the app's bundled UI locales — a tenant with only Spanish active must not advertise an
 * `/en/` alternate.
 */
export function buildHreflangAlternates({
  allowedLocales,
  language,
  origin,
  path,
}: BuildHreflangAlternatesInput): HreflangAlternate[] {
  const allowedLocaleSet = allowedLocales ? new Set(allowedLocales.map((locale) => locale.toLowerCase())) : undefined;
  const alternates = language.available
    .filter((option) => !allowedLocaleSet || allowedLocaleSet.has(option.code.toLowerCase()))
    .map((option) => {
      const localePrefix = option.isDefault ? "" : `/${option.code}`;

      return {
        hreflang: option.code,
        href: `${origin}${localePrefix}${path}`,
      };
    });

  alternates.push({ hreflang: "x-default", href: `${origin}${path}` });

  return alternates;
}
