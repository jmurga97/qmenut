import { mapPublicPromosContent } from "~/features/promos/mappers/map-public-promos-content";
import {
  mapRecommendedDish,
  pickFeaturedDish,
  pickRecommendedDishes,
} from "~/features/promos/mappers/map-recommended-content";
import { mapDish } from "~/shared/public-menu/map-dish";
import { createPublicPriceFormatter } from "~/shared/public-menu/price-formatter";

import type { TFunction } from "i18next";
import type { HighlightsContentViewModel } from "~/features/promos/types/highlights-view-model";
import type { PublicMenuData } from "~/shared/public-menu/public-menu-types";

interface MapPublicHighlightsContentInput {
  data: PublicMenuData | null;
  displayCurrency: string;
  locale: string;
  t: TFunction;
}

export function mapPublicHighlightsContent({
  data,
  displayCurrency,
  locale,
  t,
}: MapPublicHighlightsContentInput): HighlightsContentViewModel {
  const promos = mapPublicPromosContent({ data, displayCurrency, locale, t });

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

  const formatPrice = createPublicPriceFormatter({ data, displayCurrency, locale });
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
