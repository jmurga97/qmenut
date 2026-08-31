import { z } from "zod";

import { moneyInputSchema } from "~/shared/services/money";

import type { AppRouter } from "@qmenut/api/router";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type DishDetail = RouterOutputs["admin"]["menu"]["dishes"]["detail"];
export const categoryFormSchema = z.object({
  description: z.string().trim(),
  isActive: z.boolean(),
  name: z.string().trim().min(1, { message: "El nombre es obligatorio" }),
});
export const dishFormSchema = z.object({
  allergenIds: z.array(z.number().int().positive()),
  categoryId: z.string().trim().min(1, { message: "Elige una categoría" }),
  description: z.string().trim(),
  extraIngredientIds: z.array(z.string()),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  isRecommended: z.boolean(),
  name: z.string().trim().min(1, { message: "El nombre es obligatorio" }),
  price: moneyInputSchema,
  tagIds: z.array(z.string()),
});
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
export type DishFormValues = z.infer<typeof dishFormSchema>;
