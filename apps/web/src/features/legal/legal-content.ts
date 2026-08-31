import legalNoticeEn from "./content/legal-notice.en.md?raw";
import legalNoticeEs from "./content/legal-notice.es.md?raw";
import legalNoticeVenEn from "./content/legal-notice.ven.en.md?raw";
import legalNoticeVenEs from "./content/legal-notice.ven.es.md?raw";
import privacyEn from "./content/privacy.en.md?raw";
import privacyEs from "./content/privacy.es.md?raw";
import privacyVenEn from "./content/privacy.ven.en.md?raw";
import privacyVenEs from "./content/privacy.ven.es.md?raw";

import type { BUNDLED_LOCALES } from "~/lib/i18n/create-i18n";

type LegalLocale = Extract<(typeof BUNDLED_LOCALES)[number], "en" | "es">;
export type LegalCountryCode = "ESP" | "VEN";
export type LegalPage = "legalNotice" | "privacy";

export const LEGAL_OPERATOR = {
  operatorEmail: "proyectos@murga.ing",
  operatorLegalAddress: "Valencia, Valencia",
  operatorLegalName: "murga.ing",
  operatorLegalTaxId: "Z1225135E",
} as const;

const legalContent: Record<LegalPage, Record<LegalCountryCode, Record<LegalLocale, string>>> = {
  legalNotice: {
    ESP: { en: legalNoticeEn, es: legalNoticeEs },
    VEN: { en: legalNoticeVenEn, es: legalNoticeVenEs },
  },
  privacy: {
    ESP: { en: privacyEn, es: privacyEs },
    VEN: { en: privacyVenEn, es: privacyVenEs },
  },
};

const TOKEN_PATTERN = /{{\s*(\w+)\s*}}/g;
const LIST_LINE_PATTERN = /^\s*(?:[-*+]\s+|\d+[.)]\s+)/;

export function getLegalCountryCode(countryCode: string): LegalCountryCode {
  if (countryCode === "ESP" || countryCode === "VEN") {
    return countryCode;
  }

  throw new Error(`No hay una plantilla legal para el país ${countryCode}`);
}

interface GetLegalContentInput {
  countryCode: string;
  locale: string;
  page: string;
}

function getLegalPage(page: string): LegalPage {
  if (page === "legalNotice" || page === "privacy") {
    return page;
  }

  throw new Error(`No hay una plantilla legal para la página ${page}`);
}

function getLegalLocale(locale: string): LegalLocale {
  if (locale === "en" || locale === "es") {
    return locale;
  }

  throw new Error(`No hay una plantilla legal para el idioma ${locale}`);
}

export function getLegalContent({ countryCode, locale, page }: GetLegalContentInput): string {
  return legalContent[getLegalPage(page)][getLegalCountryCode(countryCode)][getLegalLocale(locale)];
}

export function getLegalOperatorValues(
  countryCode: string,
): typeof LEGAL_OPERATOR | Pick<typeof LEGAL_OPERATOR, "operatorEmail"> {
  return getLegalCountryCode(countryCode) === "ESP" ? LEGAL_OPERATOR : { operatorEmail: LEGAL_OPERATOR.operatorEmail };
}

export function interpolateLegalContent(markdown: string, values: Record<string, string | null | undefined>): string {
  return markdown
    .split("\n")
    .filter((line) => {
      if (!LIST_LINE_PATTERN.test(line)) {
        return true;
      }

      const tokens = line.matchAll(TOKEN_PATTERN).toArray();
      return tokens.every(([, token]) => values[token]?.trim());
    })
    .join("\n")
    .replaceAll(TOKEN_PATTERN, (_match, token: string) => values[token] ?? "");
}
