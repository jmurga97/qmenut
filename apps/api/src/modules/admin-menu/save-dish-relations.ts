import {
  dishBelongsToTenant,
  setDishAllergensStatements,
  setDishExtrasStatements,
  setDishTagsStatements,
} from "@qmenut/db/repositories/admin-dishes.repository";
import { TRPCError } from "@trpc/server";

import type { DrizzleDb } from "@qmenut/db/client";

interface SaveDishRelationsInput {
  db: DrizzleDb;
  restaurantId: string;
  dishId: string;
  tagIds: string[];
  allergenIds: number[];
  extraIngredientIds: string[];
}

/** Reemplaza tags, alérgenos y extras de un plato (estrategia borrar-e-insertar). */
export async function saveDishRelations({
  db,
  restaurantId,
  dishId,
  tagIds,
  allergenIds,
  extraIngredientIds,
}: SaveDishRelationsInput): Promise<void> {
  const belongs = await dishBelongsToTenant({ db, restaurantId, dishId });

  if (!belongs) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Plato no encontrado" });
  }

  await db.batch([
    ...setDishTagsStatements({ db, dishId, tagIds }),
    ...setDishAllergensStatements({ db, dishId, allergenIds }),
    ...setDishExtrasStatements({ db, dishId, ingredientIds: extraIngredientIds }),
  ]);
}
