import { z } from "zod";

const nullableText = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

/** The DB CHECK requires each reward type to carry its own data; superRefine gives a clear error before it. */
export const rewardWriteSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: nullableText,
    cost: z.number().int().min(1),
    type: z.enum(["percentage_discount", "free_dish", "special_price"]),
    percentage: z.number().int().min(0).max(100).nullable().default(null),
    specialPrice: z.number().int().min(0).nullable().default(null),
    freeDishId: z.string().trim().min(1).nullable().default(null),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.type === "free_dish" && data.freeDishId === null) {
      ctx.addIssue({ code: "custom", path: ["freeDishId"], message: "Selecciona un plato" });
    }

    if (data.type === "percentage_discount" && data.percentage === null) {
      ctx.addIssue({ code: "custom", path: ["percentage"], message: "Indica un porcentaje" });
    }

    if (data.type === "special_price") {
      if (data.freeDishId === null) {
        ctx.addIssue({ code: "custom", path: ["freeDishId"], message: "Selecciona un plato" });
      }

      if (data.specialPrice === null) {
        ctx.addIssue({ code: "custom", path: ["specialPrice"], message: "Indica un precio" });
      }
    }
  });

export const createRewardSchema = z.object({ data: rewardWriteSchema });

export const updateRewardSchema = z.object({
  rewardId: z.string().trim().min(1),
  data: rewardWriteSchema,
});

export const rewardIdInputSchema = z.object({ rewardId: z.string().trim().min(1) });
