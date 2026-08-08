import type { TFunction } from "i18next";
import type { PublicMenuData, PublicMenuPromotion } from "~/features/menu/api/public-menu-types";

export function createPriceFormatter(locale: string, currency: string) {
  let formatter: Intl.NumberFormat;

  try {
    formatter = new Intl.NumberFormat(locale, { style: "currency", currency });
  } catch {
    formatter = new Intl.NumberFormat("es-ES", { style: "currency", currency });
  }

  return (cents: number) => formatter.format(cents / 100);
}

function formatMinute(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function formatRecurringDays(days: number[], locale: string): string {
  if (days.length === 0) return "";

  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  const labels = days.map((day) => formatter.format(new Date(Date.UTC(2024, 0, day))));

  if (labels.length === 1) return labels[0] ?? "";
  if (labels.length === 2) return labels.join(", ");

  return `${labels[0]}–${labels.at(-1)}`;
}

export function formatValidity({
  locale,
  promotion,
  t,
}: {
  locale: string;
  promotion: PublicMenuPromotion;
  t: TFunction;
}): string {
  const parts: string[] = [];
  const days = formatRecurringDays(promotion.recurringDays, locale);

  if (days) parts.push(days);

  if (promotion.recurringStartMinute !== null || promotion.recurringEndMinute !== null) {
    const start = promotion.recurringStartMinute === null ? "00:00" : formatMinute(promotion.recurringStartMinute);
    const end = promotion.recurringEndMinute === null ? "23:59" : formatMinute(promotion.recurringEndMinute);
    parts.push(`${start}–${end}`);
  }

  if (parts.length > 0) return parts.join(" · ");

  if (promotion.startsAt !== null || promotion.endsAt !== null) {
    const formatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
    const start = promotion.startsAt === null ? null : formatter.format(new Date(promotion.startsAt));
    const end = promotion.endsAt === null ? null : formatter.format(new Date(promotion.endsAt));

    if (start && end) return `${start}–${end}`;
    return start ?? end ?? t("promos.page.availableToday");
  }

  return t("promos.page.availableToday");
}

export function formatDiscount(promotion: PublicMenuPromotion, t: TFunction): string {
  if (promotion.type === "percentage_discount" || promotion.type === "happy_hour") {
    return promotion.percentage === null ? t("promos.badges.happyHour") : `−${promotion.percentage}%`;
  }

  if (promotion.type === "two_for_one") {
    return `${promotion.buyQuantity ?? 2}x${promotion.paidQuantity ?? 1}`;
  }

  if (promotion.type === "daily_menu") return t("promos.badges.menu");
  return t("promos.badges.offer");
}

export function resolvePromotionPrice({
  data,
  formatPrice,
  promotion,
}: {
  data: PublicMenuData;
  formatPrice: (cents: number) => string;
  promotion: PublicMenuPromotion;
}): { oldPrice?: string; price?: string } {
  const matchingDishes = data.categories
    .flatMap((category) => category.dishes)
    .filter((dish) => dish.promotion?.id === promotion.id);
  const singleDishPromotion = matchingDishes.length === 1 ? (matchingDishes.at(0)?.promotion ?? null) : null;
  const hasReducedDishPrice =
    singleDishPromotion !== null && singleDishPromotion.effectiveUnitPrice < singleDishPromotion.basePrice;
  let price: string | undefined;

  if (singleDishPromotion !== null) {
    price = formatPrice(singleDishPromotion.effectiveUnitPrice);
  } else if (promotion.specialPrice !== null) {
    price = formatPrice(promotion.specialPrice);
  }

  return {
    oldPrice: hasReducedDishPrice ? formatPrice(singleDishPromotion.basePrice) : undefined,
    price,
  };
}
