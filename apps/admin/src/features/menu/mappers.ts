import { centsToEuros, eurosToCents } from "~/shared/services/money";

import type { DishDetail, DishFormValues } from "./types";

const ALLERGEN_LABELS: Record<string, string> = {
  celery: "Apio",
  crustaceans: "Crustáceos",
  eggs: "Huevos",
  fish: "Pescado",
  gluten: "Gluten",
  lupin: "Altramuces",
  milk: "Leche",
  molluscs: "Moluscos",
  mustard: "Mostaza",
  nuts: "Frutos de cáscara",
  peanuts: "Cacahuetes",
  sesame: "Sésamo",
  soybeans: "Soja",
  sulphites: "Sulfitos",
};

const TAG_LABELS: Record<string, string> = {
  contains_alcohol: "Contiene alcohol",
  gluten_free: "Sin gluten",
  lactose_free: "Sin lactosa",
  new: "Novedad",
  seasonal: "De temporada",
  spicy: "Picante",
  vegan: "Vegano",
};

export function toAllergenDisplayLabel(code: string) {
  return ALLERGEN_LABELS[code] ?? code;
}

export function toTagDisplayLabel(tag: { code: string | null; id: string; label: string | null }) {
  if (tag.label) return tag.label;
  if (tag.code) return TAG_LABELS[tag.code] ?? tag.code;
  return tag.id;
}

export function toDishFormValues(dish: DishDetail | null): DishFormValues {
  return {
    allergenIds: dish?.allergenIds ?? [],
    categoryId: dish?.categoryId ?? "",
    description: dish?.description ?? "",
    extraIngredientIds: dish?.extraIngredientIds ?? [],
    isActive: dish?.isActive ?? true,
    isFeatured: dish?.isFeatured ?? false,
    isRecommended: dish?.isRecommended ?? false,
    name: dish?.name ?? "",
    priceEuros: centsToEuros(dish?.price),
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
    description: values.description || undefined,
    imageUrl: imageUrl ?? undefined,
    imageUploadId,
    isActive: values.isActive,
    isFeatured: values.isFeatured,
    isRecommended: values.isRecommended,
    name: values.name,
    position,
    price: eurosToCents(values.priceEuros),
  };
}
