import { getAllergenLabel } from "./print-copy";

import type {
  PrintableMenuCategory,
  PrintableMenuDish,
  PrintableMenuModel,
  PrintableTheme,
  PublicMenuData,
} from "../types";

type PublicDish = PublicMenuData["categories"][number]["dishes"][number];

const FALLBACK_ACCENT = "#A23A28";

function toPlainText(value: string | null): string {
  if (!value) return "";
  const container = document.createElement("div");
  container.innerHTML = value
    .replaceAll(/<br\s*\/?>/gi, "\n")
    .replaceAll(/<\/p>/gi, "\n")
    .replaceAll(/<\/li>/gi, "\n");
  return (container.textContent ?? "").replaceAll(/\n\s*\n+/g, "\n").trim();
}

function createPriceFormatter(locale: string, currency: string) {
  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(locale, { currency, style: "currency" });
  } catch {
    formatter = new Intl.NumberFormat("es-ES", { currency, style: "currency" });
  }
  return (cents: number) => formatter.format(cents / 100);
}

function normalizeAccent(value: string | undefined): string {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : FALLBACK_ACCENT;
}

function normalizeTag(label: string | null, code: string | null): string | null {
  const value = label ?? code;
  return value ? value.replaceAll("_", " ") : null;
}

function formatVariantOption({
  formatPrice,
  name,
  priceDelta,
}: {
  formatPrice: (cents: number) => string;
  name: string;
  priceDelta: number;
}): string {
  if (priceDelta === 0) return name;
  const sign = priceDelta > 0 ? "+" : "";
  return `${name} (${sign}${formatPrice(priceDelta)})`;
}

function mapDish({
  dish,
  formatPrice,
  locale,
}: {
  dish: PublicDish;
  formatPrice: (cents: number) => string;
  locale: string;
}): PrintableMenuDish {
  const promotion = dish.promotion;
  const oldPrice =
    promotion && promotion.effectiveUnitPrice < promotion.basePrice ? formatPrice(promotion.basePrice) : undefined;
  return {
    allergens: dish.allergens.map(({ code }) => getAllergenLabel(locale, code)),
    description: toPlainText(dish.description),
    extras: dish.extras.map((extra) => ({ name: extra.name, price: `+${formatPrice(extra.price)}` })),
    name: dish.name,
    oldPrice,
    price: formatPrice(promotion?.effectiveUnitPrice ?? dish.price),
    promotion: promotion?.name,
    recommended: dish.isRecommended,
    tags: dish.tags.map(({ code, label }) => normalizeTag(label, code)).filter((tag): tag is string => tag !== null),
    variants: dish.variantGroups.map((group) => ({
      name: group.name,
      options: group.options.map((option) => formatVariantOption({ formatPrice, ...option })).join(" · "),
    })),
  };
}

function mapCategories({
  formatPrice,
  locale,
  menu,
}: {
  formatPrice: (cents: number) => string;
  locale: string;
  menu: PublicMenuData;
}): PrintableMenuCategory[] {
  return menu.categories
    .filter((category) => category.dishes.length > 0)
    .map((category) => ({
      description: toPlainText(category.description),
      dishes: category.dishes.map((dish) => mapDish({ dish, formatPrice, locale })),
      id: category.id,
      name: category.name,
    }));
}

export function mapPrintableMenu({
  host,
  locale,
  menu,
  theme,
}: {
  host: string;
  locale: string;
  menu: PublicMenuData;
  theme: PrintableTheme | null;
}): PrintableMenuModel {
  const formatPrice = createPriceFormatter(locale, menu.branch.currency);
  return {
    accent: normalizeAccent(theme?.primary),
    branchName: menu.branch.name,
    categories: mapCategories({ formatPrice, locale, menu }),
    host,
    locale,
    logoUrl: menu.branch.logoUrl,
    menuUrl: `https://${host}`,
    tagline: theme?.tagline?.trim() ?? "",
  };
}
