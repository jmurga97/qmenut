import { QmFeatured } from "@qmenut/ui/components/qm-featured/react";
import { QmHeading } from "@qmenut/ui/components/qm-heading/react";
import { TEMPLATES } from "@qmenut/ui/theme/presets";
import { ChefHat, Sparkles, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PromosList } from "~/features/promos/components/promos-list";
import { RecommendedList } from "~/features/promos/components/recommended-list";
import { useHighlightsContent } from "~/features/promos/hooks/use-highlights-content";
import { useTrackPageView } from "~/lib/analytics/use-analytics";
import { usePublicRouteLayout } from "~/shared/components/public-route-layout/public-route-layout-context";
import { photoUrl } from "~/shared/lib/photo-url";

const FEATURED_IMAGE_WIDTH_PX = 430;

export function HighlightsPage() {
  const content = useHighlightsContent();
  const { template } = usePublicRouteLayout();
  const showDishPhotos = TEMPLATES[template].photoMode !== "none";
  const { t } = useTranslation();

  useTrackPageView("highlights_view");

  const hasRecommended = content.recommended.dishes.length > 0;
  const hasPromos = content.promos.promos.length > 0;

  if (!content.featured && !hasRecommended && !hasPromos) {
    return (
      <div className="highlights-empty public-route-content-stage">
        <span className="highlights-empty__icon" aria-hidden="true">
          <ChefHat size={26} strokeWidth={1.6} />
        </span>
        <p className="highlights-empty__title">{t("destacados.page.empty.title")}</p>
        <p className="highlights-empty__description">{t("destacados.page.empty.description")}</p>
      </div>
    );
  }

  return (
    <div className="highlights-page public-route-content-stage">
      {content.featured ? (
        <div className="highlights-featured-frame">
          <QmFeatured
            value={{
              desc: content.featured.desc,
              name: content.featured.name,
              oldPrice: content.featured.oldPrice,
              photo: showDishPhotos,
              photoUrl: photoUrl(content.featured.photoUrl, FEATURED_IMAGE_WIDTH_PX),
              price: content.featured.price,
              secondaryTag: t(`menu.featuredBadges.${template}`),
              tag: content.featured.badge?.compactText,
            }}
          />
        </div>
      ) : null}
      {hasRecommended ? (
        <section className="highlights-section">
          <QmHeading text={t("destacados.page.recommendedTitle")} variant="secondary">
            <Sparkles slot="icon" aria-hidden="true" strokeWidth={2} />
          </QmHeading>
          <RecommendedList content={content.recommended} showDishPhotos={showDishPhotos} />
        </section>
      ) : null}
      {hasPromos ? (
        <section className="highlights-section">
          <QmHeading text={content.promos.title} variant="secondary">
            <Tag slot="icon" aria-hidden="true" strokeWidth={2} />
          </QmHeading>
          <PromosList content={content.promos} />
        </section>
      ) : null}
    </div>
  );
}
