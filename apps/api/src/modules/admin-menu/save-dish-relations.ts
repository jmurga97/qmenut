import {
  getDishPriceVariantGroup,
  setDishAllergensStatements,
  setDishExtrasStatements,
  setDishTagsStatements,
  setDishVariantStatements,
} from "@qmenut/db/repositories/admin-dishes.repository";
import { listAllergens, listIngredients, listTags } from "@qmenut/db/repositories/admin-menu-taxonomy.repository";
import { TRPCError } from "@trpc/server";

import type { DrizzleDb } from "@qmenut/db/client";
import type { DishVariantGroupWrite } from "@qmenut/db/repositories/admin-dishes.repository";

interface SaveDishRelationsInput {
  db: DrizzleDb;
  dishId: string;
  restaurantId: string;
  tagIds: string[];
  allergenIds: number[];
  extraIngredientIds: string[];
  variantGroup: DishVariantGroupWrite | null;
}

/** Reemplaza tags, alérgenos, extras y variantes de un plato (estrategia borrar-e-insertar). */
export async function saveDishRelations({
  db,
  dishId,
  restaurantId,
  tagIds,
  allergenIds,
  extraIngredientIds,
  variantGroup,
}: SaveDishRelationsInput): Promise<void> {
  const [availableTags, availableAllergens, availableIngredients, existingVariants] = await Promise.all([
    listTags({ db, restaurantId }),
    listAllergens({ db }),
    listIngredients({ db, restaurantId }),
    getDishPriceVariantGroup({ db, dishId }),
  ]);
  assertKnownIds({ ids: tagIds, knownIds: availableTags.map((tag) => tag.id), relationLabel: "etiquetas" });
  assertKnownIds({
    ids: allergenIds,
    knownIds: availableAllergens.map((allergen) => allergen.id),
    relationLabel: "alérgenos",
  });
  assertKnownIds({
    ids: extraIngredientIds,
    knownIds: availableIngredients.map((ingredient) => ingredient.id),
    relationLabel: "extras",
  });
  assertKnownIds({
    ids: [variantGroup?.id, ...(variantGroup?.options.map((option) => option.id) ?? [])].filter(
      (id): id is string => id !== undefined,
    ),
    knownIds: existingVariants ? [existingVariants.id, ...existingVariants.options.map((option) => option.id)] : [],
    relationLabel: "variantes",
  });

  await db.batch([
    ...setDishTagsStatements({ db, dishId, tagIds }),
    ...setDishAllergensStatements({ db, dishId, allergenIds }),
    ...setDishExtrasStatements({ db, dishId, ingredientIds: extraIngredientIds }),
    ...setDishVariantStatements({ db, dishId, existing: existingVariants, group: variantGroup }),
  ]);
}

interface AssertKnownIdsInput<TId extends number | string> {
  ids: TId[];
  knownIds: TId[];
  relationLabel: string;
}

function assertKnownIds<TId extends number | string>({ ids, knownIds, relationLabel }: AssertKnownIdsInput<TId>) {
  const known = new Set(knownIds);
  if (ids.some((id) => !known.has(id))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `El plato contiene ${relationLabel} no válidos` });
  }
}
