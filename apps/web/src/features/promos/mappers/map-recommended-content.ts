import { mapDish } from "~/features/menu/mappers/map-public-menu-content";

import type { TFunction } from "i18next";
import type { PublicMenuData, PublicMenuDish } from "~/features/menu/api/public-menu-types";
import type { RecommendedDishViewModel } from "~/features/promos/types/highlights-view-model";

export function pickFeaturedDish(data: PublicMenuData): PublicMenuDish | null {
  return data.categories.flatMap((category) => category.dishes).find((dish) => dish.isFeatured) ?? null;
}

export function pickRecommendedDishes(data: PublicMenuData): PublicMenuDish[] {
  return data.categories.flatMap((category) => category.dishes).filter((dish) => dish.isRecommended);
}

export function mapRecommendedDish({
  dish,
  formatPrice,
  t,
}: {
  dish: PublicMenuDish;
  formatPrice: (cents: number) => string;
  t: TFunction;
}): RecommendedDishViewModel {
  const base = mapDish({ dish, formatPrice, t });

  return {
    badge: base.badge,
    desc: base.desc,
    featured: dish.isFeatured,
    name: base.name,
    oldPrice: base.oldPrice,
    photoUrl: base.photoUrl,
    price: base.price,
    rowKey: base.rowKey,
  };
}
