import { ALLERGEN_META } from "~/features/menu/constants/allergens";

import type { PublicMenuData, PublicMenuDish } from "~/features/menu/api/public-menu-types";
import type { AllergenCode } from "~/features/menu/constants/allergens";
import type {
  MenuContentViewModel,
  MenuDishViewModel,
  MenuSectionViewModel,
} from "~/features/menu/types/menu-view-model";
import type { TFunction } from "i18next";

interface MapPublicMenuContentInput {
  data: PublicMenuData;
  locale: string;
  t: TFunction;
}

function isAllergenCode(code: string): code is AllergenCode {
  return code in ALLERGEN_META;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function buildLogoLabel(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "");

  return initials.join("") || "QM";
}

function createPriceFormatter(locale: string, currency: string) {
  let formatter: Intl.NumberFormat;

  try {
    formatter = new Intl.NumberFormat(locale, { style: "currency", currency });
  } catch {
    formatter = new Intl.NumberFormat("es-ES", { style: "currency", currency });
  }

  return (cents: number) => formatter.format(cents / 100);
}

function mapDish({
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
  const allergens = dish.allergens.map((allergen) => allergen.code).filter(isAllergenCode);
  const descHtml = dish.description ?? "";
  const extras = [...dish.extras]
    .sort((a, b) => a.position - b.position)
    .map((extra) => ({
      name: extra.name,
      price: `+${formatPrice(extra.price)}`,
    }));

  return {
    allergens: allergens.length > 0 ? allergens : undefined,
    desc: stripHtml(descHtml),
    descHtml,
    extras: extras.length > 0 ? extras : undefined,
    name: dish.name,
    oldPrice: hasDiscount ? formatPrice(promotion.basePrice) : undefined,
    photoUrl: dish.imageUrl ?? undefined,
    price: formatPrice(promotion?.effectiveUnitPrice ?? dish.price),
    rowKey: dish.id,
    tag: promotion?.name ?? (dish.isRecommended ? t("menu.recommended") : undefined),
  };
}

function pickFeaturedDish(data: PublicMenuData): PublicMenuDish | null {
  const dishes = data.categories.flatMap((category) => category.dishes);

  return dishes.find((dish) => dish.isFeatured) ?? dishes.find((dish) => dish.isRecommended) ?? dishes[0] ?? null;
}

export function mapPublicMenuContent({ data, locale, t }: MapPublicMenuContentInput): MenuContentViewModel {
  const formatPrice = createPriceFormatter(locale, data.branch.currency);
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

  return {
    featured: featuredDish ? mapDish({ dish: featuredDish, formatPrice, t }) : null,
    heroLabel: t("menu.heroLabel"),
    logoLabel: buildLogoLabel(data.branch.name),
    sections,
  };
}
