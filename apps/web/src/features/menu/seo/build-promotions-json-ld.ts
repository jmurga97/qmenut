import type { PublicMenuData } from "~/features/menu/api/public-menu-types";

export function buildPromotionsJsonLd(data: PublicMenuData): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: data.promotions.map((promotion, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Offer",
        name: promotion.name,
        ...(promotion.description && { description: promotion.description }),
        ...(promotion.startsAt && { validFrom: new Date(promotion.startsAt).toISOString() }),
        ...(promotion.endsAt && { validThrough: new Date(promotion.endsAt).toISOString() }),
      },
    })),
  };
}
