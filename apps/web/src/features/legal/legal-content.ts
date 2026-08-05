import legalNoticeEn from "./content/legal-notice.en.md?raw";
import legalNoticeEs from "./content/legal-notice.es.md?raw";
import privacyEn from "./content/privacy.en.md?raw";
import privacyEs from "./content/privacy.es.md?raw";

import type { BUNDLED_LOCALES } from "~/lib/i18n/create-i18n";

type LegalLocale = Extract<(typeof BUNDLED_LOCALES)[number], "en" | "es">;
export type LegalPage = "legalNotice" | "privacy";

export const LEGAL_OPERATOR = {
  operatorEmail: "proyectos@murga.ing",
  operatorLegalAddress: "Valencia, Valencia",
  operatorLegalName: "murga.ing",
  operatorLegalTaxId: "Z1225135E",
} as const;

const legalContent: Record<LegalPage, Record<LegalLocale, string>> = {
  legalNotice: { en: legalNoticeEn, es: legalNoticeEs },
  privacy: { en: privacyEn, es: privacyEs },
};

const TOKEN_PATTERN = /{{\s*(\w+)\s*}}/g;
const LIST_LINE_PATTERN = /^\s*(?:[-*+]\s+|\d+[.)]\s+)/;

export function getLegalContent(page: LegalPage, locale: LegalLocale): string {
  return legalContent[page][locale];
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
