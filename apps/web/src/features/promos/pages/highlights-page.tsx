import { QmFeatured } from "@qmenut/ui/components/qm-featured/react";
import { QmHeading } from "@qmenut/ui/components/qm-heading/react";
import { ChefHat, Sparkles, Tag } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import "~/features/promos/styles.css";
import { MenuDishModal } from "~/features/menu/components/menu-dish-modal";
import { PromosList } from "~/features/promos/components/promos-list";
import { RecommendedList } from "~/features/promos/components/recommended-list";
import { useHighlightsContent } from "~/features/promos/hooks/use-highlights-content";
import { track } from "~/lib/analytics/posthog";
import { useTrackPageView } from "~/lib/analytics/use-analytics";
import { usePublicRouteLayout } from "~/shared/components/public-route-layout/public-route-layout-context";
import { getPhotoLayout } from "~/shared/lib/photo-layout";
import { responsivePhotoSource } from "~/shared/lib/photo-url";

import type { MenuDishViewModel } from "~/features/menu/types/menu-view-model";

export function HighlightsPage() {
  const content = useHighlightsContent();
  const { template, tenant, theme } = usePublicRouteLayout();
  const showDishPhotos = tenant.showMenuPhotos;
  const { t } = useTranslation();
  const dishTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [selectedDish, setSelectedDish] = useState<MenuDishViewModel | null>(null);

  useTrackPageView("highlights_view");

  function handleSelectDish(dish: MenuDishViewModel, trigger: HTMLButtonElement) {
    dishTriggerRef.current = trigger;
    track("dish_opened", { dish_id: dish.rowKey, dish_name: dish.name, source: "highlights" });
    setSelectedDish(dish);
  }

  function handleCloseDish() {
    const trigger = dishTriggerRef.current;
    setSelectedDish(null);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
    });
  }

  const hasRecommended = content.recommended.dishes.length > 0;
  const hasPromos = content.promos.promos.length > 0;
  const featuredSource = responsivePhotoSource({
    canonicalUrl: content.featured?.photoUrl,
    ...getPhotoLayout({ template, theme }).featured,
    variants: content.featured?.photoVariants,
  });

  if (!content.featured && !hasRecommended && !hasPromos) {
    return (
      <div className="highlights-empty">
        <span className="highlights-empty__icon" aria-hidden="true">
          <ChefHat size={26} strokeWidth={1.6} />
        </span>
        <p className="highlights-empty__title">{t("destacados.page.empty.title")}</p>
        <p className="highlights-empty__description">{t("destacados.page.empty.description")}</p>
      </div>
    );
  }

  return (
    <div className="highlights-page">
      {content.featured ? (
        <div className="highlights-featured-frame">
          <QmFeatured
            value={{
              desc: content.featured.desc,
              name: content.featured.name,
              oldPrice: content.featured.oldPrice,
              photo: showDishPhotos,
              photoUrl: featuredSource?.src,
              photoFallbackUrl: content.featured.photoUrl,
              photoSrcSet: featuredSource?.srcSet,
              photoSizes: featuredSource?.sizes,
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
          <RecommendedList
            content={content.recommended}
            onSelectDish={handleSelectDish}
            showDishPhotos={showDishPhotos}
          />
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
      <MenuDishModal dish={selectedDish} showDishPhoto={showDishPhotos} onClose={handleCloseDish} />
    </div>
  );
}
