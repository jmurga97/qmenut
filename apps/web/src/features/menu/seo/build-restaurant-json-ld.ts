import type { PublicMenuData } from "~/features/menu/api/public-menu-types";

const SCHEMA_DAY_NAMES: Record<number, string> = {
  1: "https://schema.org/Monday",
  2: "https://schema.org/Tuesday",
  3: "https://schema.org/Wednesday",
  4: "https://schema.org/Thursday",
  5: "https://schema.org/Friday",
  6: "https://schema.org/Saturday",
  7: "https://schema.org/Sunday",
};

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");

  return `${hours}:${mins}`;
}

interface BuildRestaurantJsonLdInput {
  data: PublicMenuData;
  origin: string;
}

/**
 * Carries the menu content that dom-shim SSR only renders into Lit shadow DOM (invisible to
 * non-JS crawlers) as schema.org structured data instead of attempting full Lit SSR.
 */
export function buildRestaurantJsonLd({ data, origin }: BuildRestaurantJsonLdInput): Record<string, unknown> {
  const { branch, categories, language } = data;

  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: branch.name,
    url: origin,
    ...(branch.phone ? { telephone: branch.phone } : {}),
    ...(branch.address ? { address: { "@type": "PostalAddress", streetAddress: branch.address } } : {}),
    ...(branch.photos.length > 0 ? { image: branch.photos.map((photo) => photo.url) } : {}),
    ...(branch.schedules.length > 0
      ? {
          openingHoursSpecification: branch.schedules.map((schedule) => ({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: SCHEMA_DAY_NAMES[schedule.dayOfWeek],
            opens: minutesToTime(schedule.openMinute),
            closes: minutesToTime(schedule.closeMinute),
          })),
        }
      : {}),
    hasMenu: {
      "@type": "Menu",
      inLanguage: language.effective,
      hasMenuSection: categories.map((category) => ({
        "@type": "MenuSection",
        name: category.name,
        ...(category.description ? { description: category.description } : {}),
        hasMenuItem: category.dishes.map((dish) => ({
          "@type": "MenuItem",
          name: dish.name,
          ...(dish.description ? { description: dish.description } : {}),
          ...(dish.imageUrl ? { image: dish.imageUrl } : {}),
          offers: {
            "@type": "Offer",
            price: (dish.price / 100).toFixed(2),
            priceCurrency: branch.currency,
          },
        })),
      })),
    },
  };
}
