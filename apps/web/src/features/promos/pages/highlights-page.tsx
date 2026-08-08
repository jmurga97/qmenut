import { QmFeatured } from "@qmenut/ui/components/qm-featured/react";
import { defineQmHeading } from "@qmenut/ui/components/qm-heading";
import { TEMPLATES } from "@qmenut/ui/theme/presets";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { PromosList } from "~/features/promos/components/promos-list";
import { RecommendedList } from "~/features/promos/components/recommended-list";
import { useHighlightsContent } from "~/features/promos/hooks/use-highlights-content";
import { useTrackPageView } from "~/lib/analytics/use-analytics";
import { PublicPageShell } from "~/shared/components/public-page-shell";
import { PublicPageSkeleton } from "~/shared/components/public-page-skeleton";
import { ScrollHidePageHeader } from "~/shared/components/scroll-hide-page-header";
import { useLocale } from "~/shared/hooks/use-locale";
import { usePublicTenant } from "~/shared/hooks/use-public-tenant";
import { useTemplateSelection } from "~/shared/hooks/use-template-selection";

defineQmHeading();

export function HighlightsPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const content = useHighlightsContent();
  const { tenant } = usePublicTenant();
  const { template } = useTemplateSelection(tenant);
  const showDishPhotos = TEMPLATES[template].photoMode !== "none";
  const { handleLanguageChange, lang, langLabel, langOptions } = useLocale();
  const { t } = useTranslation();

  useTrackPageView("highlights_view");

  if (!tenant) {
    return <PublicPageSkeleton />;
  }

  return (
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
        {content.featuredPromo ? <QmFeatured value={content.featuredPromo} /> : null}
        <qm-heading text={t("destacados.page.recommendedTitle")} />
        <RecommendedList content={content.recommended} showDishPhotos={showDishPhotos} />
        <qm-heading text={content.promos.title} />
        <PromosList content={content.promos} />
      </div>
    </PublicPageShell>
  );
}
