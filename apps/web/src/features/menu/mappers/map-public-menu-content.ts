import { pickFeaturedDish } from "~/features/menu/mappers/pick-featured-dish";
import { mapDish, stripHtml } from "~/shared/public-menu/map-dish";
import { mapPromotionToFeatured } from "~/shared/public-menu/map-promotion-to-featured";
import { pickFeaturedPromo } from "~/shared/public-menu/pick-featured-promo";
import { createPublicPriceFormatter } from "~/shared/public-menu/price-formatter";

import type { TFunction } from "i18next";
import type { MenuContentViewModel, MenuSectionViewModel } from "~/shared/public-menu/menu-view-model";
import type { PublicMenuData } from "~/shared/public-menu/public-menu-types";

interface MapPublicMenuContentInput {
  data: PublicMenuData;
  displayCurrency: string;
  locale: string;
  t: TFunction;
}

function buildLogoLabel(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "");

  return initials.join("") || "QM";
}

export function mapPublicMenuContent({
  data,
  displayCurrency,
  locale,
  t,
}: MapPublicMenuContentInput): MenuContentViewModel {
  const formatPrice = createPublicPriceFormatter({ data, displayCurrency, locale });
  const sections: MenuSectionViewModel[] = data.categories
    .filter((category) => category.dishes.length > 0)
    .map((category, index) => ({
      count: t("menu.dishCount", { count: category.dishes.length }),
      dishes: category.dishes.map((dish) => mapDish({ dish, formatPrice, t })),
      id: category.id,
      label: category.name,
      num: String(index + 1).padStart(2, "0"),
      tagline: stripHtml(category.description ?? ""),
    }));
  const featuredDish = pickFeaturedDish(data);
  const featuredPromoEntity = pickFeaturedPromo(data.promotions);

  return {
    featured: featuredDish ? mapDish({ dish: featuredDish, formatPrice, t }) : null,
    featuredPromo: featuredPromoEntity
      ? mapPromotionToFeatured({ data, formatPrice, promotion: featuredPromoEntity, t })
      : null,
    featuredPromoId: featuredPromoEntity?.id ?? null,
    heroLabel: t("menu.heroLabel"),
    logoLabel: buildLogoLabel(data.branch.name),
    sections,
  };
}
