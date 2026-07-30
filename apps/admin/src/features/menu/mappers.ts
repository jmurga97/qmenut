import { centsToEuros, eurosToCents } from "~/shared/services/money";

import type { DishDetail, DishFormValues } from "./types";

export function toDishFormValues(dish: DishDetail | null): DishFormValues {
  return {
    allergenIds: dish?.allergenIds ?? [],
    categoryId: dish?.categoryId ?? "",
    description: dish?.description ?? "",
    extraIngredientIds: dish?.extraIngredientIds ?? [],
    imageUrl: dish?.imageUrl ?? "",
    isActive: dish?.isActive ?? true,
    isFeatured: dish?.isFeatured ?? false,
    isRecommended: dish?.isRecommended ?? false,
    name: dish?.name ?? "",
    priceEuros: centsToEuros(dish?.price),
    tagIds: dish?.tagIds ?? [],
  };
}
export function toDishInput({ position, values }: { position: number; values: DishFormValues }) {
  return {
    categoryId: values.categoryId,
    description: values.description || undefined,
    imageUrl: values.imageUrl || undefined,
    isActive: values.isActive,
    isFeatured: values.isFeatured,
    isRecommended: values.isRecommended,
    name: values.name,
    position,
    price: eurosToCents(values.priceEuros),
  };
}
