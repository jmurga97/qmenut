import { mapDish } from "~/features/menu/mappers/map-public-menu-content";
import { mapPublicPromosContent } from "~/features/promos/mappers/map-public-promos-content";
import {
  mapRecommendedDish,
  pickFeaturedDish,
  pickRecommendedDishes,
} from "~/features/promos/mappers/map-recommended-content";
import { createPriceFormatter } from "~/shared/lib/price-formatter";

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
  const promos = mapPublicPromosContent({ data, locale, t });

  if (!data) {
    return {
      featured: null,
      promos,
      recommended: {
        dishes: [],
        emptyLabel: t("destacados.page.recommendedEmptyLabel"),
      },
      subtitle: t("destacados.page.subtitle"),
      title: t("destacados.page.title"),
    };
  }

  const formatPrice = createPriceFormatter(locale, data.sourceCurrency);
  const featuredDish = pickFeaturedDish(data);

  return {
    featured: featuredDish ? mapDish({ dish: featuredDish, formatPrice, t }) : null,
    promos,
    recommended: {
      dishes: pickRecommendedDishes(data).map((dish) => mapRecommendedDish({ dish, formatPrice, t })),
      emptyLabel: t("destacados.page.recommendedEmptyLabel"),
    },
    subtitle: t("destacados.page.subtitle"),
    title: t("destacados.page.title"),
  };
}
