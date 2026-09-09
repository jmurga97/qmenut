import {
  categoryBelongsToBranch,
  createDishStatement,
  updateDishStatement,
} from "@qmenut/db/repositories/admin-dishes.repository";
import { TRPCError } from "@trpc/server";

import type { DrizzleDb } from "@qmenut/db/client";
import type { DishWriteData } from "@qmenut/db/repositories/admin-dishes.repository";
import type { BatchItem } from "drizzle-orm/batch";

interface SaveDishInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
  dishId?: string;
  data: DishWriteData;
  entityId?: string;
  statements?: BatchItem<"sqlite">[];
  preserveImage?: boolean;
}

/**
 * Crea o actualiza un plato validando que la sucursal es del tenant y que la
 * categoría destino pertenece a esa misma sucursal (la FK compuesta de la DB lo
 * exige; validamos antes para devolver un error claro).
 */
export async function saveDish({
  db,
  restaurantId,
  branchId,
  dishId,
  data,
  entityId = crypto.randomUUID(),
  statements: extraStatements = [],
  preserveImage,
}: SaveDishInput): Promise<{ id: string }> {
  // The menu router authorizes the branch or existing dish context before calling this writer.
  const categoryOk = await categoryBelongsToBranch({ db, branchId, categoryId: data.categoryId });

  if (!categoryOk) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "La categoría no pertenece a esta sucursal" });
  }

  if (dishId) {
    await db.batch([updateDishStatement({ db, restaurantId, dishId, data, preserveImage }), ...extraStatements]);

    return { id: dishId };
  }

  await db.batch([createDishStatement({ db, restaurantId, branchId, data, id: entityId }), ...extraStatements]);
  return { id: entityId };
}
