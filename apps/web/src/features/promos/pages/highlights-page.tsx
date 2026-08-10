import { QmFeatured } from "@qmenut/ui/components/qm-featured/react";
import { QmHeading } from "@qmenut/ui/components/qm-heading/react";
import { TEMPLATES } from "@qmenut/ui/theme/presets";
import { useTranslation } from "react-i18next";

import { PromosList } from "~/features/promos/components/promos-list";
import { RecommendedList } from "~/features/promos/components/recommended-list";
import { useHighlightsContent } from "~/features/promos/hooks/use-highlights-content";
import { useTrackPageView } from "~/lib/analytics/use-analytics";
import { usePublicRouteLayout } from "~/shared/components/public-route-layout/public-route-layout-context";

export function HighlightsPage() {
  const content = useHighlightsContent();
  const { template } = usePublicRouteLayout();
  const showDishPhotos = TEMPLATES[template].photoMode !== "none";
  const { t } = useTranslation();

  useTrackPageView("highlights_view");

  return (
    <>
      {content.featuredPromo ? <QmFeatured value={content.featuredPromo} /> : null}
      <QmHeading text={t("destacados.page.recommendedTitle")} />
      <RecommendedList content={content.recommended} showDishPhotos={showDishPhotos} />
      <QmHeading text={content.promos.title} />
      <PromosList content={content.promos} />
    </>
  );
}
