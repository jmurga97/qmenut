import {
  setDishAllergensStatements,
  setDishExtrasStatements,
  setDishTagsStatements,
} from "@qmenut/db/repositories/admin-dishes.repository";
import { listAllergens, listIngredients, listTags } from "@qmenut/db/repositories/admin-menu-taxonomy.repository";
import { TRPCError } from "@trpc/server";

import type { DrizzleDb } from "@qmenut/db/client";

interface SaveDishRelationsInput {
  db: DrizzleDb;
  dishId: string;
  restaurantId: string;
  tagIds: string[];
  allergenIds: number[];
  extraIngredientIds: string[];
}

/** Reemplaza tags, alérgenos y extras de un plato (estrategia borrar-e-insertar). */
export async function saveDishRelations({
  db,
  dishId,
  restaurantId,
  tagIds,
  allergenIds,
  extraIngredientIds,
}: SaveDishRelationsInput): Promise<void> {
  const [availableTags, availableAllergens, availableIngredients] = await Promise.all([
    listTags({ db, restaurantId }),
    listAllergens({ db }),
    listIngredients({ db, restaurantId }),
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

  await db.batch([
    ...setDishTagsStatements({ db, dishId, tagIds }),
    ...setDishAllergensStatements({ db, dishId, allergenIds }),
    ...setDishExtrasStatements({ db, dishId, ingredientIds: extraIngredientIds }),
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
