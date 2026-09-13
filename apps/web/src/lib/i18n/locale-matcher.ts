interface ParsedLocale<LocaleCode extends string> {
  original: LocaleCode;
  canonical: string;
}

function parseLocale(value: string): string | undefined {
  try {
    return new Intl.Locale(value).toString();
  } catch {
    return undefined;
  }
}

function addCandidate(candidates: string[], parts: (string | undefined)[]): void {
  const candidate = parseLocale(parts.filter((part): part is string => part !== undefined).join("-"));
  if (candidate && !candidates.includes(candidate)) {
    candidates.push(candidate);
  }
}

function isRegionSubtag(value: string): boolean {
  return /^[A-Z]{2}$/.test(value) || /^\d{3}$/.test(value);
}

function getLocaleCandidates(value: string): string[] {
  let locale: Intl.Locale;

  try {
    locale = new Intl.Locale(value);
  } catch {
    return [];
  }

  const candidates = [locale.toString()];

  if (locale.baseName !== locale.toString()) {
    candidates.push(locale.baseName);
  }

  const baseParts = locale.baseName.split("-");
  const regionIndex = baseParts.findIndex((part, index) => index > 0 && isRegionSubtag(part));
  if (regionIndex !== -1) {
    addCandidate(candidates, [...baseParts.slice(0, regionIndex), ...baseParts.slice(regionIndex + 1)]);
  }

  addCandidate(candidates, [locale.language]);

  return candidates;
}

function findSupported<LocaleCode extends string>(
  candidates: string[],
  supported: ParsedLocale<LocaleCode>[],
): LocaleCode | undefined {
  for (const candidate of candidates) {
    const match = supported.find((entry) => entry.canonical === candidate);
    if (match) return match.original;
  }

  return undefined;
}

/** Matches preferences to supported BCP 47 tags while returning the supported tag as-is. */
export function matchSupportedLocale<LocaleCode extends string>(
  preferences: string | readonly string[] | undefined,
  supportedLocales: readonly LocaleCode[],
): LocaleCode | undefined {
  const supported: ParsedLocale<LocaleCode>[] = [];
  for (const original of supportedLocales) {
    const canonical = parseLocale(original);
    if (canonical) supported.push({ canonical, original });
  }

  const requestedLocales = typeof preferences === "string" ? [preferences] : (preferences ?? []);

  for (const requested of requestedLocales) {
    const match = findSupported(getLocaleCandidates(requested), supported);
    if (match) return match;
  }

  return undefined;
}
