import { TRPCError } from "@trpc/server";
import {
  dishBelongsToTenant,
  setDishAllergens,
  setDishExtras,
  setDishTags,
} from "@qmenut/db/repositories/admin-dishes.repository";

import type { DrizzleDb } from "@qmenut/db";

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
    throw new TRPCError({ code: "NOT_FOUND", message: "Dish not found" });
  }

  await setDishTags({ db, dishId, tagIds });
  await setDishAllergens({ db, dishId, allergenIds });
  await setDishExtras({ db, dishId, ingredientIds: extraIngredientIds });
}
