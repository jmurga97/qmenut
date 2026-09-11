import { ALLERGEN_META } from "~/shared/public-menu/allergens";
import { formatDiscount } from "~/shared/public-menu/promotion-formatting";

import type { TFunction } from "i18next";
import type { AllergenCode } from "~/shared/public-menu/allergens";
import type { MenuDishBadgeViewModel, MenuDishViewModel } from "~/shared/public-menu/menu-view-model";
import type { PublicMenuDish } from "~/shared/public-menu/public-menu-types";

function isAllergenCode(code: string): code is AllergenCode {
  return Object.hasOwn(ALLERGEN_META, code);
}

export function stripHtml(html: string): string {
  return html.replaceAll(/<[^<>]*>/g, "");
}

export function mapDish({
  dish,
  formatPrice,
  t,
}: {
  dish: PublicMenuDish;
  formatPrice: (cents: number) => string;
  t: TFunction;
}): MenuDishViewModel {
  const promotion = dish.promotion;
  const hasDiscount = promotion !== null && promotion.effectiveUnitPrice < promotion.basePrice;
  // oxlint-disable-next-line unicorn/no-array-callback-reference -- isAllergenCode is a single-param type guard; passing it directly keeps the narrowing.
  const allergens = dish.allergens.map((allergen) => allergen.code).filter(isAllergenCode);
  const descHtml = dish.description ?? "";
  const extras = dish.extras
    .toSorted((a, b) => a.position - b.position)
    .map((extra) => ({
      name: extra.name,
      price: `+${formatPrice(extra.price)}`,
    }));
  let badge: MenuDishBadgeViewModel | undefined;

  if (promotion) {
    badge = { compactText: formatDiscount(promotion, t), fullText: promotion.name };
  } else if (dish.isRecommended) {
    const recommendedText = t("menu.recommended");
    badge = { compactText: recommendedText, fullText: recommendedText };
  }

  return {
    allergens: allergens.length > 0 ? allergens : undefined,
    badge,
    desc: stripHtml(descHtml),
    descHtml,
    extras: extras.length > 0 ? extras : undefined,
    featured: dish.isFeatured,
    name: dish.name,
    oldPrice: hasDiscount ? formatPrice(promotion.basePrice) : undefined,
    photoUrl: dish.imageUrl ?? undefined,
    photoVariants: dish.variants,
    price: formatPrice(promotion?.effectiveUnitPrice ?? dish.price),
    rowKey: dish.id,
  };
}
