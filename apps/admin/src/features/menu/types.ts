import { z } from "zod";

import { i18n } from "~/lib/i18n";
import { moneyInputSchema, parseMoneyInput } from "~/shared/services/money";

import type { RouterOutputs } from "~/lib/trpc";

export type DishDetail = RouterOutputs["admin"]["menu"]["dishes"]["detail"];
export const categoryFormSchema = z
  .object({
    description: z.string().trim(),
    isActive: z.boolean(),
    name: z
      .string()
      .trim()
      .min(1, { message: i18n.t("menu___El nombre es obligatorio") }),
    scheduleDays: z.array(z.number().int().min(1).max(7)),
    scheduleEnabled: z.boolean(),
    scheduleEnd: z.string(),
    scheduleStart: z.string(),
  })
  .superRefine((values, context) => {
    if (!values.scheduleEnabled) return;

    if (values.scheduleDays.length === 0) {
      context.addIssue({ code: "custom", message: i18n.t("menu___Elige al menos un día"), path: ["scheduleDays"] });
    }
    for (const path of ["scheduleStart", "scheduleEnd"] as const) {
      if (!values[path]) {
        context.addIssue({ code: "custom", message: i18n.t("menu___La hora es obligatoria"), path: [path] });
      }
    }
  });
const dishVariantFormSchema = z.object({
  name: z
    .string()
    .trim()
    .max(24, { message: i18n.t("menu___Máximo 24 caracteres") }),
  price: z.string().trim(),
  variantId: z.string().optional(),
});
export const dishFormSchema = z
  .object({
    allergenIds: z.array(z.number().int().positive()),
    categoryId: z
      .string()
      .trim()
      .min(1, { message: i18n.t("menu___Elige una categoría") }),
    comboDescription: z
      .string()
      .trim()
      .max(2000, { message: i18n.t("menu___La descripción no puede superar 2.000 caracteres") }),
    comboEnabled: z.boolean(),
    comboPrice: z.string().trim(),
    description: z.string().trim(),
    extraIngredientIds: z.array(z.string()),
    isActive: z.boolean(),
    isFeatured: z.boolean(),
    isRecommended: z.boolean(),
    name: z
      .string()
      .trim()
      .min(1, { message: i18n.t("menu___El nombre es obligatorio") }),
    price: z.string().trim(),
    tagIds: z.array(z.string()),
    variantGroupId: z.string().optional(),
    variantGroupName: z
      .string()
      .trim()
      .max(60, { message: i18n.t("menu___Máximo 60 caracteres") }),
    variants: z.array(dishVariantFormSchema),
    variantsEnabled: z.boolean(),
  })
  .superRefine((values, context) => {
    if (values.variantsEnabled) {
      addVariantIssues({ context, values });
    } else if (!moneyInputSchema.safeParse(values.price).success) {
      context.addIssue({ code: "custom", message: i18n.t("shared___Introduce un importe válido"), path: ["price"] });
    }
    if (!values.comboEnabled) return;

    if (!moneyInputSchema.safeParse(values.comboPrice).success) {
      context.addIssue({
        code: "custom",
        message: i18n.t("menu___El precio del combo es obligatorio"),
        path: ["comboPrice"],
      });
    }
    if (!values.comboDescription) {
      context.addIssue({
        code: "custom",
        message: i18n.t("menu___La descripción del combo es obligatoria"),
        path: ["comboDescription"],
      });
    }
  });
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
export type DishFormValues = z.infer<typeof dishFormSchema>;

export const MAX_DISH_VARIANTS = 6;

function addVariantIssues({
  context,
  values,
}: {
  context: z.RefinementCtx;
  values: Pick<DishFormValues, "variantGroupName" | "variants">;
}) {
  if (!values.variantGroupName) {
    context.addIssue({
      code: "custom",
      message: i18n.t("menu___El nombre es obligatorio"),
      path: ["variantGroupName"],
    });
  }
  if (values.variants.length < 2) {
    context.addIssue({ code: "custom", message: i18n.t("menu___Añade al menos dos variantes"), path: ["variants"] });
  }
  if (new Set(values.variants.map((variant) => parseMoneyInput(variant.price))).size < 2) {
    context.addIssue({
      code: "custom",
      message: i18n.t("menu___Las variantes deben tener precios distintos"),
      path: ["variants"],
    });
  }
  values.variants.forEach((variant, index) => {
    if (!variant.name) {
      context.addIssue({
        code: "custom",
        message: i18n.t("menu___El nombre es obligatorio"),
        path: ["variants", index, "name"],
      });
    }
    if (!moneyInputSchema.safeParse(variant.price).success) {
      context.addIssue({
        code: "custom",
        message: i18n.t("shared___Introduce un importe válido"),
        path: ["variants", index, "price"],
      });
    }
  });
}
