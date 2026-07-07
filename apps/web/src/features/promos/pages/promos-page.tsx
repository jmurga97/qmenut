import { useRef } from "react";

import { useTrackPageView } from "~/lib/analytics/use-analytics";
import { PromosList } from "~/features/promos/components/promos-list";
import { usePromosContent } from "~/features/promos/hooks/use-promos-content";
import { DevTemplateSwitcher } from "~/shared/components/dev-template-switcher";
import { PublicPageShell } from "~/shared/components/public-page-shell";
import { PublicPageSkeleton } from "~/shared/components/public-page-skeleton";
import { ScrollHidePageHeader } from "~/shared/components/scroll-hide-page-header";
import { useLocale } from "~/shared/hooks/use-locale";
import { usePublicTenant } from "~/shared/hooks/use-public-tenant";
import { useTemplateSelection } from "~/shared/hooks/use-template-selection";

export function PromosPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const content = usePromosContent();
  const { tenant } = usePublicTenant();
  const { setTemplate, template } = useTemplateSelection(tenant);
  const { handleLanguageChange, lang, langLabel, langOptions } = useLocale();

  useTrackPageView("promo_view");

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
          title={content.title}
          subtitle={content.subtitle}
          langValue={lang}
          langOptions={langOptions}
          langLabel={langLabel}
          titleSize="lg"
          onQmChange={handleLanguageChange}
        />

        <div className="home-scroll" ref={scrollRef}>
          <PromosList content={content} />
        </div>
      </PublicPageShell>
      <DevTemplateSwitcher currentTemplate={template} onSelectTemplate={setTemplate} />
    </>
  );
}
