import { mapPromotionToFeatured } from "~/features/promos/mappers/map-promotion-to-featured";
import { mapPublicPromosContent } from "~/features/promos/mappers/map-public-promos-content";
import { mapRecommendedDish, pickRecommendedDishes } from "~/features/promos/mappers/map-recommended-content";
import { pickFeaturedPromo } from "~/features/promos/mappers/pick-featured-promo";
import { createPriceFormatter } from "~/features/promos/mappers/promotion-formatting";

import type { TFunction } from "i18next";
import type { PublicMenuData } from "~/features/menu/api/public-menu-types";
import type { HighlightsContentViewModel } from "~/features/promos/types/highlights-view-model";

interface MapPublicHighlightsContentInput {
  data: PublicMenuData | null;
  locale: string;
  t: TFunction;
}

export function mapPublicHighlightsContent({
  data,
  locale,
  t,
}: MapPublicHighlightsContentInput): HighlightsContentViewModel {
  const formatPrice = createPriceFormatter(locale, data?.branch.currency ?? "EUR");
  const featuredPromoEntity = data ? pickFeaturedPromo(data.promotions) : null;

  return {
    featuredPromo:
      data && featuredPromoEntity
        ? mapPromotionToFeatured({ data, formatPrice, promotion: featuredPromoEntity, t })
        : null,
    promos: mapPublicPromosContent({ data, locale, t }),
    recommended: {
      dishes: data ? pickRecommendedDishes(data).map((dish) => mapRecommendedDish({ dish, formatPrice, t })) : [],
      emptyLabel: t("destacados.page.recommendedEmptyLabel"),
    },
    subtitle: t("destacados.page.subtitle"),
    title: t("destacados.page.title"),
  };
}
