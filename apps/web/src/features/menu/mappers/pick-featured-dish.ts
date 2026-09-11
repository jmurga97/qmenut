import type { PublicMenuData, PublicMenuDish } from "~/shared/public-menu/public-menu-types";

export function pickFeaturedDish(data: PublicMenuData): PublicMenuDish | null {
  const dishes = data.categories.flatMap((category) => category.dishes);

  return dishes.find((dish) => dish.isFeatured) ?? dishes.find((dish) => dish.isRecommended) ?? dishes[0] ?? null;
}
