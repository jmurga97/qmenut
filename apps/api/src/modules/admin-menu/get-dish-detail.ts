import { getDishDetail as findDishDetail } from "@qmenut/db/repositories/admin-dishes.repository";
import { TRPCError } from "@trpc/server";

import { getTranslationTexts, translateText } from "./translation-overlay";

import type { DrizzleDb } from "@qmenut/db/client";
import type { AdminDishDetail } from "@qmenut/db/repositories/admin-dishes.repository";

interface GetDishDetailInput {
  db: DrizzleDb;
  languageCode?: string;
  restaurantId: string;
  dishId: string;
}

export async function getDishDetail({
  db,
  languageCode,
  restaurantId,
  dishId,
}: GetDishDetailInput): Promise<AdminDishDetail> {
  const dish = await findDishDetail({ db, restaurantId, dishId });

  if (!dish) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Plato no encontrado" });
  }

  if (!languageCode) {
    return dish;
  }

  const texts = await getTranslationTexts({ db, ids: [dish.id], languageCode, restaurantId });
  return {
    ...dish,
    description: translateText({ entityId: dish.id, fallback: dish.description, field: "description", texts }),
    name: translateText({ entityId: dish.id, fallback: dish.name, field: "name", texts }),
  };
}
