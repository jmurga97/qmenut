import { z } from "zod";

import { moneyInputSchema } from "~/shared/services/money";

import type { RouterOutputs } from "~/lib/trpc";

export type DishDetail = RouterOutputs["admin"]["menu"]["dishes"]["detail"];
export const categoryFormSchema = z.object({
  description: z.string().trim(),
  isActive: z.boolean(),
  name: z.string().trim().min(1, { message: "El nombre es obligatorio" }),
});
export const dishFormSchema = z
  .object({
    allergenIds: z.array(z.number().int().positive()),
    categoryId: z.string().trim().min(1, { message: "Elige una categoría" }),
    comboDescription: z.string().trim().max(2000, { message: "La descripción no puede superar 2.000 caracteres" }),
    comboEnabled: z.boolean(),
    comboPrice: z.string().trim(),
    description: z.string().trim(),
    extraIngredientIds: z.array(z.string()),
    isActive: z.boolean(),
    isFeatured: z.boolean(),
    isRecommended: z.boolean(),
    name: z.string().trim().min(1, { message: "El nombre es obligatorio" }),
    price: moneyInputSchema,
    tagIds: z.array(z.string()),
  })
  .superRefine((values, context) => {
    if (!values.comboEnabled) return;

    if (!moneyInputSchema.safeParse(values.comboPrice).success) {
      context.addIssue({ code: "custom", message: "El precio del combo es obligatorio", path: ["comboPrice"] });
    }
    if (!values.comboDescription) {
      context.addIssue({
        code: "custom",
        message: "La descripción del combo es obligatoria",
        path: ["comboDescription"],
      });
    }
  });
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
export type DishFormValues = z.infer<typeof dishFormSchema>;
