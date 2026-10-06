import { i18n } from "~/lib/i18n";
import { formatMoneyInput, moneyInputSchema, parseMoneyInput } from "~/shared/services/money";
import { hhmmToMinutes, minutesToHHMM } from "~/shared/services/week-time";

import type { CategoryFormValues, DishDetail, DishFormValues } from "./types";

interface CategorySchedule {
  recurringDays: string | null;
  recurringEndMinute: number | null;
  recurringStartMinute: number | null;
}

const TAG_LABELS: Record<string, string> = {
  contains_alcohol: i18n.t("menu___Contiene alcohol"),
  gluten_free: i18n.t("menu___Sin gluten"),
  lactose_free: i18n.t("menu___Sin lactosa"),
  new: i18n.t("menu___Novedad"),
  seasonal: i18n.t("menu___De temporada"),
  spicy: i18n.t("menu___Picante"),
  vegan: i18n.t("menu___Vegano"),
};

export function toTagDisplayLabel(tag: { code: string | null; id: string; label: string | null }) {
  if (tag.label) return tag.label;
  if (tag.code) return TAG_LABELS[tag.code] ?? tag.code;
  return tag.id;
}

export function toDishFormValues(dish: DishDetail | null): DishFormValues {
  return {
    allergenIds: dish?.allergenIds ?? [],
    categoryId: dish?.categoryId ?? "",
    comboDescription: dish?.comboDescription ?? "",
    comboEnabled: dish?.comboEnabled ?? false,
    comboPrice: formatMoneyInput(dish?.comboPrice),
    description: dish?.description ?? "",
    extraIngredientIds: dish?.extraIngredientIds ?? [],
    isActive: dish?.isActive ?? true,
    isFeatured: dish?.isFeatured ?? false,
    isRecommended: dish?.isRecommended ?? false,
    name: dish?.name ?? "",
    price: formatMoneyInput(dish?.price),
    tagIds: dish?.tagIds ?? [],
    variantGroupId: dish?.variantGroup?.id,
    variantGroupName: dish?.variantGroup?.name ?? i18n.t("menu___Tamaño"),
    variants: dish?.variantGroup?.options.map((option) => ({
      name: option.name,
      price: formatMoneyInput(option.price),
      variantId: option.id,
    })) ?? [
      { name: "", price: "" },
      { name: "", price: "" },
    ],
    variantsEnabled: Boolean(dish?.variantGroup),
  };
}

export function toDishVariantGroupInput(values: DishFormValues) {
  if (!values.variantsEnabled) return null;
  return {
    id: values.variantGroupId,
    name: values.variantGroupName,
    options: values.variants.map((variant) => ({
      id: variant.variantId,
      name: variant.name,
      price: parseMoneyInput(variant.price),
    })),
  };
}
export function toDishInput({
  imageUploadId,
  imageUrl,
  position,
  values,
}: {
  imageUploadId?: string;
  imageUrl: string | null;
  position: number;
  values: DishFormValues;
}) {
  return {
    categoryId: values.categoryId,
    comboDescription: values.comboDescription || undefined,
    comboEnabled: values.comboEnabled,
    comboPrice: moneyInputSchema.safeParse(values.comboPrice).success ? parseMoneyInput(values.comboPrice) : null,
    description: values.description || undefined,
    imageUrl: imageUrl ?? undefined,
    imageUploadId,
    isActive: values.isActive,
    isFeatured: values.isFeatured,
    isRecommended: values.isRecommended,
    name: values.name,
    position,
    // With variants the base price is the cheapest one; the API recomputes it when saving the variants.
    price: values.variantsEnabled
      ? Math.min(...values.variants.map((variant) => parseMoneyInput(variant.price)))
      : parseMoneyInput(values.price),
  };
}

export function toCategoryScheduleValues(category: CategorySchedule | undefined) {
  return {
    scheduleDays: category?.recurringDays?.split(",").map(Number) ?? [],
    scheduleEnabled: Boolean(category?.recurringDays),
    scheduleEnd: typeof category?.recurringEndMinute === "number" ? minutesToHHMM(category.recurringEndMinute) : "",
    scheduleStart:
      typeof category?.recurringStartMinute === "number" ? minutesToHHMM(category.recurringStartMinute) : "",
  };
}
export function toCategoryInput({
  scheduleDays,
  scheduleEnabled,
  scheduleEnd,
  scheduleStart,
  ...values
}: CategoryFormValues) {
  return {
    ...values,
    recurringDays: scheduleEnabled ? scheduleDays.toSorted((a, b) => a - b).join(",") : undefined,
    recurringEndMinute: scheduleEnabled ? hhmmToMinutes(scheduleEnd) : null,
    recurringStartMinute: scheduleEnabled ? hhmmToMinutes(scheduleStart) : null,
  };
}
