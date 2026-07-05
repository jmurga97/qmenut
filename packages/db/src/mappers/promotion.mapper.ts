import { parseRecurringDays } from "../domain/promotions";

import type { PublicDishPromotion, PublicPromotion } from "../models/promotion";
import type { promotions, vDishPromotionPrices } from "../schema/promotions";

export type PromotionRow = typeof promotions.$inferSelect;
export type PromotionCandidateRow = typeof vDishPromotionPrices.$inferSelect;

export function mapPromotion(row: PromotionRow): PublicPromotion {
  return {
    id: row.id,
    type: row.type,
    scope: row.scope,
    name: row.name,
    description: row.description,
    percentage: row.percentage,
    specialPrice: row.specialPrice,
    buyQuantity: row.buyQuantity,
    paidQuantity: row.paidQuantity,
    priority: row.priority,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    recurringDays: parseRecurringDays(row.recurringDays),
    recurringStartMinute: row.recurringStartMinute,
    recurringEndMinute: row.recurringEndMinute,
  };
}

export function mapDishPromotion({
  candidate,
  promotion,
}: {
  candidate: PromotionCandidateRow;
  promotion: PromotionRow;
}): PublicDishPromotion {
  return {
    ...mapPromotion(promotion),
    basePrice: candidate.basePrice,
    effectiveUnitPrice: candidate.effectiveUnitPrice,
  };
}
