import { z } from "zod";

import { moneyInputSchema } from "~/shared/services/money";

import type { AppRouter } from "@qmenut/api/router";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type PromotionDetail = RouterOutputs["admin"]["promotions"]["get"];
export const promotionTypes = ["percentage_discount", "special_price", "two_for_one"] as const;
export const promotionScopes = ["category", "dish"] as const;
export const promotionStatuses = ["active", "inactive", "expired"] as const;
const percentage = z
  .string()
  .trim()
  .regex(/^(?:100|\d{1,2}|)$/, "Introduce un porcentaje entre 0 y 100");
const price = moneyInputSchema.or(z.literal(""));
const quantity = z
  .string()
  .trim()
  .regex(/^(?:[1-9]\d*|)$/, "Introduce un número entero mayor que 0");
export const promotionFormSchema = z
  .object({
    buyQuantity: quantity,
    name: z.string().trim().min(1, { message: "El nombre es obligatorio" }),
    paidQuantity: quantity,
    percentage,
    scope: z.enum(promotionScopes),
    specialPrice: price,
    status: z.enum(promotionStatuses),
    targetIds: z.array(z.string()),
    type: z.enum(promotionTypes),
  })
  .superRefine((values, context) => {
    if (values.targetIds.length === 0) {
      context.addIssue({ code: "custom", message: "Selecciona al menos un destino", path: ["targetIds"] });
    }
    if (values.type === "percentage_discount" && values.percentage === "") {
      context.addIssue({ code: "custom", message: "Indica un porcentaje", path: ["percentage"] });
    }
    if (values.type === "special_price" && values.specialPrice === "") {
      context.addIssue({ code: "custom", message: "Indica un precio", path: ["specialPrice"] });
    }
    if (values.type === "two_for_one") {
      if (values.buyQuantity === "") {
        context.addIssue({
          code: "custom",
          message: "Indica las unidades que lleva",
          path: ["buyQuantity"],
        });
      }
      if (values.paidQuantity === "") {
        context.addIssue({
          code: "custom",
          message: "Indica las unidades que paga",
          path: ["paidQuantity"],
        });
      }
      if (
        values.buyQuantity !== "" &&
        values.paidQuantity !== "" &&
        Number(values.paidQuantity) > Number(values.buyQuantity)
      ) {
        context.addIssue({
          code: "custom",
          message: "Las unidades pagadas no pueden superar las compradas",
          path: ["paidQuantity"],
        });
      }
    }
  });
export type PromotionFormValues = z.infer<typeof promotionFormSchema>;
export type PromotionScope = PromotionFormValues["scope"];
export type PromotionType = PromotionFormValues["type"];
export type EditablePromotion = PromotionDetail & { scope: PromotionScope; type: PromotionType };
export function isEditablePromotion(promotion: PromotionDetail): promotion is EditablePromotion {
  return (
    promotionScopes.includes(promotion.scope as PromotionScope) &&
    promotionTypes.includes(promotion.type as PromotionType)
  );
}
