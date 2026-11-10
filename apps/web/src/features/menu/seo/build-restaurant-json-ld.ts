import { findPriceVariantGroup, stripHtml } from "~/shared/public-menu/map-dish";

import type { PublicMenuData } from "~/shared/public-menu/public-menu-types";

const SCHEMA_DAY_NAMES: Record<number, string> = {
  1: "https://schema.org/Monday",
  2: "https://schema.org/Tuesday",
  3: "https://schema.org/Wednesday",
  4: "https://schema.org/Thursday",
  5: "https://schema.org/Friday",
  6: "https://schema.org/Saturday",
  7: "https://schema.org/Sunday",
};

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");

  return `${hours}:${mins}`;
}

function socialProfileUrls(value: unknown): string[] {
  if (value === null || typeof value !== "object") return [];

  return Object.values(value).filter((url): url is string => typeof url === "string" && URL.canParse(url));
}

interface BuildRestaurantJsonLdInput {
  data: PublicMenuData;
  includeMenu?: boolean;
  origin: string;
}

/** Adds machine-readable restaurant and menu semantics alongside the visible Lit SSR markup. */
export function buildRestaurantJsonLd({
  data,
  includeMenu = true,
  origin,
}: BuildRestaurantJsonLdInput): Record<string, unknown> {
  const { branch, categories, language, sourceCurrency } = data;
  const sameAs = socialProfileUrls(branch.socialLinks);

  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    // Same @id on every page so crawlers merge the menu and contact entities into one.
    "@id": `${origin}/#restaurant`,
    name: branch.name,
    url: `${origin}/`,
    ...(branch.phone && { telephone: branch.phone }),
    ...(branch.address && {
      address: { "@type": "PostalAddress", streetAddress: branch.address, addressCountry: data.countryCode },
    }),
    ...(branch.latitude !== null &&
      branch.longitude !== null && {
        geo: { "@type": "GeoCoordinates", latitude: branch.latitude, longitude: branch.longitude },
      }),
    ...(branch.logoUrl && { logo: branch.logoUrl }),
    ...(branch.photos.length > 0 && { image: branch.photos.map((photo) => photo.url) }),
    ...(sameAs.length > 0 && { sameAs }),
    acceptsReservations: data.publicFeatures.reservations ? `${origin}/reservar` : false,
    ...(branch.schedules.length > 0 && {
      openingHoursSpecification: branch.schedules.map((schedule) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: SCHEMA_DAY_NAMES[schedule.dayOfWeek],
        opens: minutesToTime(schedule.openMinute),
        // schema.org lee un cierre a las 00:00 como ventana de longitud cero; 23:59 es el fin de día.
        closes: minutesToTime(schedule.closeMinute === 0 ? 1439 : schedule.closeMinute),
      })),
    }),
    ...(!includeMenu && { hasMenu: `${origin}/` }),
    ...(includeMenu && {
      hasMenu: {
        "@type": "Menu",
        inLanguage: language.effective,
        hasMenuSection: categories.map((category) => ({
          "@type": "MenuSection",
          name: category.name,
          ...(category.description && { description: stripHtml(category.description).trim() }),
          hasMenuItem: category.dishes.map((dish) => ({
            "@type": "MenuItem",
            name: dish.name,
            ...(dish.description && { description: stripHtml(dish.description).trim() }),
            ...(dish.imageUrl && { image: dish.imageUrl }),
            offers: (findPriceVariantGroup(dish)?.options ?? [{ name: undefined, priceDelta: 0 }]).map((option) => ({
              "@type": "Offer",
              ...(option.name && { name: option.name }),
              price: ((dish.price + option.priceDelta) / 100).toFixed(2),
              priceCurrency: sourceCurrency,
            })),
          })),
        })),
      },
    }),
  };
}
