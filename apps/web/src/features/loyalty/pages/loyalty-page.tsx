import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { LoyaltyExperience } from "~/features/loyalty/components/loyalty-experience";
import { useTrackPageView } from "~/lib/analytics/use-analytics";
import { DevTemplateSwitcher } from "~/shared/components/dev-template-switcher";
import { PublicPageShell } from "~/shared/components/public-page-shell";
import { PublicPageSkeleton } from "~/shared/components/public-page-skeleton";
import { ScrollHidePageHeader } from "~/shared/components/scroll-hide-page-header";
import { useLocale } from "~/shared/hooks/use-locale";
import { usePublicTenant } from "~/shared/hooks/use-public-tenant";
import { useTemplateSelection } from "~/shared/hooks/use-template-selection";

export function LoyaltyPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const { tenant } = usePublicTenant();
  const { setTemplate, template } = useTemplateSelection(tenant);
  const { handleLanguageChange, lang, langLabel, langOptions } = useLocale();

  useTrackPageView("loyalty_view");

  if (!tenant) {
    return <PublicPageSkeleton />;
  }

  return (
    <>
      <PublicPageShell tenant={tenant} template={template}>
        <ScrollHidePageHeader
          scrollContainerRef={scrollRef}
          topbarBrand="QMENUT"
          topbarName={tenant.tenantName}
          title={t("loyalty.page.title")}
          subtitle={t("loyalty.page.subtitle")}
          langValue={lang}
          langOptions={langOptions}
          langLabel={langLabel}
          titleSize="lg"
          onQmChange={handleLanguageChange}
        />

        <div className="home-scroll" ref={scrollRef}>
          <div className="loyalty-page">
            <LoyaltyExperience restaurantName={tenant.tenantName} />
          </div>
        </div>
      </PublicPageShell>
      <DevTemplateSwitcher currentTemplate={template} onSelectTemplate={setTemplate} />
    </>
  );
}
