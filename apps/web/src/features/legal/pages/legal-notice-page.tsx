import { marked } from "marked";
import { useTranslation } from "react-i18next";

import { LegalPageLayout } from "~/features/legal/components/legal-page-layout";
import { useLegalBranch } from "~/features/legal/hooks/use-legal-branch";
import { getLegalContent, interpolateLegalContent } from "~/features/legal/legal-content";
import { chromeLocale } from "~/lib/i18n/create-i18n";
import { useLocale } from "~/shared/hooks/use-locale";

export function LegalNoticePage() {
  const branch = useLegalBranch();
  const { lang } = useLocale();
  const { t } = useTranslation();

  if (!branch) {
    return null;
  }

  const markdown = interpolateLegalContent(getLegalContent("legalNotice", chromeLocale(lang)), {
    branchName: branch.name,
    branchAddress: branch.address,
    branchPhone: branch.phone,
  });

  return (
    <LegalPageLayout title={t("legal.legalNotice.title")} subtitle={t("legal.legalNotice.subtitle")}>
      <article className="legal-prose" dangerouslySetInnerHTML={{ __html: marked.parse(markdown) }} />
    </LegalPageLayout>
  );
}
