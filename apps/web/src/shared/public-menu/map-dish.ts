import { ALLERGEN_META } from "~/shared/public-menu/allergens";
import { formatDiscount } from "~/shared/public-menu/promotion-formatting";

import type { TFunction } from "i18next";
import type { AllergenCode } from "~/shared/public-menu/allergens";
import type {
  MenuDishBadgeViewModel,
  MenuDishPriceViewModel,
  MenuDishViewModel,
} from "~/shared/public-menu/menu-view-model";
import type { PublicMenuDish } from "~/shared/public-menu/public-menu-types";

function isAllergenCode(code: string): code is AllergenCode {
  return Object.hasOwn(ALLERGEN_META, code);
}

export function stripHtml(html: string): string {
  return html.replaceAll(/<[^<>]*>/g, "");
}

/**
 * Mirrors v_dish_promotion_prices per variant: the view prices the base (cheapest, delta 0)
 * variant; percentage promotions scale every variant, fixed-price ones only replace the base.
 */
function promotedVariantPrice({ dish, priceDelta }: { dish: PublicMenuDish; priceDelta: number }): number {
  const { promotion } = dish;
  const regular = dish.price + priceDelta;
  if (!promotion) return regular;
  if (priceDelta === 0) return promotion.effectiveUnitPrice;
  const scales =
    promotion.type === "percentage_discount" || (promotion.type === "happy_hour" && promotion.specialPrice === null);
  return scales ? Math.round((regular * (100 - (promotion.percentage ?? 0))) / 100) : regular;
}

/** Price variants are the first group whose options cost differently; free choices (flavour, drink…) are not. */
export function findPriceVariantGroup(dish: PublicMenuDish) {
  return dish.variantGroups.find((group) => new Set(group.options.map((option) => option.priceDelta)).size > 1);
}

function mapVariants({
  dish,
  formatPrice,
}: {
  dish: PublicMenuDish;
  formatPrice: (cents: number) => string;
}): Pick<MenuDishViewModel, "prices" | "variantList"> {
  const group = findPriceVariantGroup(dish);
  if (!group) return {};

  const variants: MenuDishPriceViewModel[] = group.options.map((option) => {
    const regular = dish.price + option.priceDelta;
    const effective = promotedVariantPrice({ dish, priceDelta: option.priceDelta });
    return {
      label: option.name,
      oldValue: effective < regular ? formatPrice(regular) : undefined,
      value: formatPrice(effective),
    };
  });
  return {
    prices: variants.slice(0, 2),
    variantList:
      variants.length > 2
        ? { items: variants.map(({ label, value }) => ({ name: label, price: value })), label: group.name }
        : undefined,
  };
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
  const comboEnabled = dish.comboEnabled && dish.comboPrice !== null && Boolean(dish.comboDescription?.trim());
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
    comboDescription: comboEnabled ? stripHtml(dish.comboDescription ?? "") : undefined,
    comboLabel: comboEnabled ? t("menu.comboAvailable") : undefined,
    comboPrice: comboEnabled ? formatPrice(dish.comboPrice ?? 0) : undefined,
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
    ...mapVariants({ dish, formatPrice }),
  };
}
