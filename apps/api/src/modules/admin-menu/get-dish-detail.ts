import { TRPCError } from "@trpc/server";
import { getDishDetail as findDishDetail } from "@qmenut/db/repositories/admin-dishes.repository";

import type { DrizzleDb } from "@qmenut/db";
import type { AdminDishDetail } from "@qmenut/db/repositories/admin-dishes.repository";

interface GetDishDetailInput {
  db: DrizzleDb;
  restaurantId: string;
  dishId: string;
}

export async function getDishDetail({ db, restaurantId, dishId }: GetDishDetailInput): Promise<AdminDishDetail> {
  const dish = await findDishDetail({ db, restaurantId, dishId });

  if (!dish) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Dish not found" });
  }

  return dish;
}
