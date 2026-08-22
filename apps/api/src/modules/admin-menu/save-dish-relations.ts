import {
  setDishAllergensStatements,
  setDishExtrasStatements,
  setDishTagsStatements,
} from "@qmenut/db/repositories/admin-dishes.repository";

import type { DrizzleDb } from "@qmenut/db/client";

interface SaveDishRelationsInput {
  db: DrizzleDb;
  dishId: string;
  tagIds: string[];
  allergenIds: number[];
  extraIngredientIds: string[];
}

/** Reemplaza tags, alérgenos y extras de un plato (estrategia borrar-e-insertar). */
export async function saveDishRelations({
  db,
  dishId,
  tagIds,
  allergenIds,
  extraIngredientIds,
}: SaveDishRelationsInput): Promise<void> {
  // The menu router resolves the active, tenant-scoped dish context before calling this writer.
  await db.batch([
    ...setDishTagsStatements({ db, dishId, tagIds }),
    ...setDishAllergensStatements({ db, dishId, allergenIds }),
    ...setDishExtrasStatements({ db, dishId, ingredientIds: extraIngredientIds }),
  ]);
}
