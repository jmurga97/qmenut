import type { PublicMenuPromotion } from "~/shared/public-menu/public-menu-types";

export function pickFeaturedPromo(promotions: PublicMenuPromotion[]): PublicMenuPromotion | null {
  if (promotions.length === 0) return null;

  return promotions.toSorted((a, b) => b.priority - a.priority || b.updatedAt - a.updatedAt)[0] ?? null;
}
