import { useRef } from "react";

import { useTrackPageView } from "~/lib/analytics/use-analytics";
import { FidelityPlaceholder } from "~/features/fidelity/components/fidelity-placeholder";
import { useFidelityContent } from "~/features/fidelity/hooks/use-fidelity-content";
import { DevTemplateSwitcher } from "~/shared/components/dev-template-switcher";
import { PublicPageShell } from "~/shared/components/public-page-shell";
import { PublicPageSkeleton } from "~/shared/components/public-page-skeleton";
import { ScrollHidePageHeader } from "~/shared/components/scroll-hide-page-header";
import { useLocale } from "~/shared/hooks/use-locale";
import { usePublicTenant } from "~/shared/hooks/use-public-tenant";
import { useTemplateSelection } from "~/shared/hooks/use-template-selection";

export function FidelityPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const content = useFidelityContent();
  const { tenant } = usePublicTenant();
  const { setTemplate, template } = useTemplateSelection(tenant);
  const { handleLanguageChange, lang, langLabel, langOptions } = useLocale();

  useTrackPageView("fidelity_view");

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
          <FidelityPlaceholder content={content} />
        </div>
      </PublicPageShell>
      <DevTemplateSwitcher currentTemplate={template} onSelectTemplate={setTemplate} />
    </>
  );
}
