import type { PromotionType } from "../schema/promotions";

export interface PublicPromotion {
  buyQuantity: number | null;
  description: string | null;
  endsAt: number | null;
  id: string;
  name: string;
  paidQuantity: number | null;
  percentage: number | null;
  priority: number;
  recurringDays: number[];
  recurringEndMinute: number | null;
  recurringStartMinute: number | null;
  scope: "branch" | "category" | "dish" | "info";
  specialPrice: number | null;
  startsAt: number | null;
  type: PromotionType;
  updatedAt: number;
}

export interface PublicDishPromotion extends PublicPromotion {
  basePrice: number;
  effectiveUnitPrice: number;
}
