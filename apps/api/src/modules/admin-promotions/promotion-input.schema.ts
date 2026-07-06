import { z } from "zod";

const nullableText = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

export const promotionTargetSchema = z.object({
  targetType: z.enum(["dish", "category"]),
  targetId: z.string().trim().min(1),
});

/**
 * MVP1: soportamos descuento porcentual y precio especial, con alcance a plato o
 * categoría, y vigencia por fechas o recurrente. El CHECK de la DB exige que cada
 * tipo lleve su dato; validamos con superRefine para dar un error claro antes.
 */
export const promotionWriteSchema = z
  .object({
    type: z.enum(["percentage_discount", "special_price", "daily_menu", "happy_hour", "two_for_one"]),
    scope: z.enum(["info", "branch", "category", "dish"]),
    name: z.string().trim().min(1).max(200),
    description: nullableText,
    percentage: z.number().int().min(0).max(100).nullable().default(null),
    specialPrice: z.number().int().min(0).nullable().default(null),
    priority: z.number().int().min(0).default(0),
    startsAt: z.number().int().nullable().default(null),
    endsAt: z.number().int().nullable().default(null),
    isRecurring: z.boolean().default(false),
    recurringDays: nullableText,
    recurringStartMinute: z.number().int().min(0).max(1439).nullable().default(null),
    recurringEndMinute: z.number().int().min(0).max(1439).nullable().default(null),
    status: z.enum(["active", "inactive", "expired"]).default("active"),
  })
  .superRefine((data, ctx) => {
    if (data.scope === "info") {
      return;
    }

    if (data.type === "percentage_discount" && data.percentage === null) {
      ctx.addIssue({ code: "custom", path: ["percentage"], message: "Indica un porcentaje" });
    }

    if ((data.type === "special_price" || data.type === "daily_menu") && data.specialPrice === null) {
      ctx.addIssue({ code: "custom", path: ["specialPrice"], message: "Indica un precio" });
    }

    if (data.type === "happy_hour" && data.percentage === null && data.specialPrice === null) {
      ctx.addIssue({ code: "custom", path: ["percentage"], message: "Indica un porcentaje o un precio" });
    }
  });

export const createPromotionSchema = z.object({
  branchId: z.string().trim().min(1),
  data: promotionWriteSchema,
  targets: z.array(promotionTargetSchema).max(200).default([]),
});

export const updatePromotionSchema = z.object({
  promotionId: z.string().trim().min(1),
  data: promotionWriteSchema,
  targets: z.array(promotionTargetSchema).max(200).default([]),
});
