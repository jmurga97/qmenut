import { marked } from "marked";

import { LegalPageLayout } from "~/features/legal/components/legal-page-layout";
import { useLegalContent } from "~/features/legal/hooks/use-legal-content";
import { LEGAL_OPERATOR, getLegalContent, interpolateLegalContent } from "~/features/legal/legal-content";
import { chromeLocale } from "~/lib/i18n/create-i18n";
import { useLocale } from "~/shared/hooks/use-locale";

export function LegalNoticePage() {
  const content = useLegalContent();
  const { lang } = useLocale();

  if (!content) {
    return null;
  }

  const markdown = interpolateLegalContent(getLegalContent("legalNotice", chromeLocale(lang)), {
    branchName: content.branch.name,
    branchAddress: content.branch.address,
    branchPhone: content.branch.phone,
    ownerLegalName: content.legal.name,
    ownerTaxId: content.legal.taxId,
    ownerLegalAddress: content.legal.address,
    ownerDataProtectionEmail: content.legal.dataProtectionEmail,
    ...LEGAL_OPERATOR,
  });

  return (
    <LegalPageLayout>
      <article className="legal-prose" dangerouslySetInnerHTML={{ __html: marked.parse(markdown) }} />
    </LegalPageLayout>
  );
}
