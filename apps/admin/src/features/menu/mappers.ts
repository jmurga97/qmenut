import { i18n } from "~/lib/i18n";
import { formatMoneyInput, moneyInputSchema, parseMoneyInput } from "~/shared/services/money";

import type { DishDetail, DishFormValues } from "./types";

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
    price: parseMoneyInput(values.price),
  };
}
