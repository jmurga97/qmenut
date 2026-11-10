import type { PublicMenuLanguage } from "~/shared/public-menu/public-menu-types";

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

/** hreflang only accepts language[-script][-region]; variants such as `ca-valencia` are dropped. */
function toHreflang(code: string): string {
  try {
    const { language, script, region } = new Intl.Locale(code);

    return [language, script, region].filter(Boolean).join("-");
  } catch {
    return code;
  }
}

/** The router serves `/en` and redirects `/en/`, so the locale home has no trailing slash. */
function buildLocalizedPath(localePrefix: string, path: string): string {
  return localePrefix && path === "/" ? localePrefix : `${localePrefix}${path}`;
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
  const options = language.available.filter(
    (option) => !allowedLocaleSet || allowedLocaleSet.has(option.code.toLowerCase()),
  );
  const codes = new Set(options.map((option) => option.code.toLowerCase()));
  const alternates = options.flatMap((option) => {
    const hreflang = toHreflang(option.code);
    // `ca-valencia` stands in as `ca` unless the tenant also offers plain `ca`.
    if (hreflang.toLowerCase() !== option.code.toLowerCase() && codes.has(hreflang.toLowerCase())) return [];
    const localePrefix = option.isDefault ? "" : `/${option.code}`;

    return [{ hreflang, href: `${origin}${buildLocalizedPath(localePrefix, path)}` }];
  });

  alternates.push({ hreflang: "x-default", href: `${origin}${path}` });

  return alternates;
}
