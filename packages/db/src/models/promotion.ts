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
  type: "daily_menu" | "happy_hour" | "percentage_discount" | "special_price" | "two_for_one";
}

export interface PublicDishPromotion extends PublicPromotion {
  basePrice: number;
  effectiveUnitPrice: number;
}
