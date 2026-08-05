import { marked } from "marked";
import { useTranslation } from "react-i18next";

import { LegalPageLayout } from "~/features/legal/components/legal-page-layout";
import { useLegalContent } from "~/features/legal/hooks/use-legal-content";
import { LEGAL_OPERATOR, getLegalContent, interpolateLegalContent } from "~/features/legal/legal-content";
import { chromeLocale } from "~/lib/i18n/create-i18n";
import { useLocale } from "~/shared/hooks/use-locale";

export function PrivacyPage() {
  const content = useLegalContent();
  const { lang } = useLocale();
  const { t } = useTranslation();

  if (!content) {
    return null;
  }

  const markdown = interpolateLegalContent(getLegalContent("privacy", chromeLocale(lang)), {
    branchName: content.branch.name,
    ownerLegalName: content.legal.name,
    ownerTaxId: content.legal.taxId,
    ownerLegalAddress: content.legal.address,
    ownerDataProtectionEmail: content.legal.dataProtectionEmail,
    ...LEGAL_OPERATOR,
  });

  return (
    <LegalPageLayout title={t("legal.privacy.title")} subtitle={t("legal.privacy.subtitle")}>
      <article className="legal-prose" dangerouslySetInnerHTML={{ __html: marked.parse(markdown) }} />
    </LegalPageLayout>
  );
}
