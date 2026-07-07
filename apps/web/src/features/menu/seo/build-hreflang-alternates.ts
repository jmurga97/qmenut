import type { PublicMenuLanguage } from "~/features/menu/api/public-menu-types";

export interface HreflangAlternate {
  hreflang: string;
  href: string;
}

interface BuildHreflangAlternatesInput {
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
export function buildHreflangAlternates({ language, origin, path }: BuildHreflangAlternatesInput): HreflangAlternate[] {
  const alternates = language.available.map((option) => ({
    hreflang: option.code,
    href: `${origin}${option.isDefault ? "" : `/${option.code}`}${path}`,
  }));

  alternates.push({ hreflang: "x-default", href: `${origin}${path}` });

  return alternates;
}
