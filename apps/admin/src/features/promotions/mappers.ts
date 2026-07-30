import { centsToEuros, eurosToCents } from "~/shared/services/money";

import type { EditablePromotion, PromotionDetail, PromotionFormValues } from "./types";

function optionalNumber(value: string): number | null {
  return value === "" ? null : Number(value);
}
function preservedData(promotion: PromotionDetail | null) {
  if (!promotion) return {};
  const data: Partial<PromotionDetail> = { ...promotion };
  delete data.id;
  delete data.targets;
  return data;
}
export function toPromotionFormValues(promotion: EditablePromotion | null): PromotionFormValues {
  return {
    buyQuantity: String(promotion?.buyQuantity ?? ""),
    name: promotion?.name ?? "",
    paidQuantity: String(promotion?.paidQuantity ?? ""),
    percentage: String(promotion?.percentage ?? ""),
    scope: promotion?.scope ?? "dish",
    specialPriceEuros: centsToEuros(promotion?.specialPrice),
    status: promotion?.status ?? "active",
    targetIds: promotion?.targets.map(({ targetId }) => targetId) ?? [],
    type: promotion?.type ?? "percentage_discount",
  };
}
export function toPromotionInput({
  promotion,
  values,
}: {
  promotion: EditablePromotion | null;
  values: PromotionFormValues;
}) {
  return {
    data: {
      ...preservedData(promotion),
      buyQuantity: values.type === "two_for_one" ? optionalNumber(values.buyQuantity) : null,
      description: promotion?.description ?? undefined,
      name: values.name,
      paidQuantity: values.type === "two_for_one" ? optionalNumber(values.paidQuantity) : null,
      percentage: values.type === "percentage_discount" ? optionalNumber(values.percentage) : null,
      scope: values.scope,
      recurringDays: promotion?.recurringDays ?? undefined,
      specialPrice: values.type === "special_price" ? eurosToCents(values.specialPriceEuros) : null,
      status: values.status,
      type: values.type,
    },
    targets: values.targetIds.map((targetId) => ({ targetId, targetType: values.scope })),
  };
}
