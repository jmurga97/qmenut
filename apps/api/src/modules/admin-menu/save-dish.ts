import {
  categoryBelongsToBranch,
  createDish,
  getDishTranslatableFields,
  updateDishStatement,
} from "@qmenut/db/repositories/admin-dishes.repository";
import { markTranslationsPendingUpdateStatement } from "@qmenut/db/repositories/translations.repository";
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
}

/**
 * Crea o actualiza un plato validando que la sucursal es del tenant y que la
 * categoría destino pertenece a esa misma sucursal (la FK compuesta de la DB lo
 * exige; validamos antes para devolver un error claro).
 */
export async function saveDish({ db, restaurantId, branchId, dishId, data }: SaveDishInput): Promise<{ id: string }> {
  // The menu router authorizes the branch or existing dish context before calling this writer.
  const categoryOk = await categoryBelongsToBranch({ db, branchId, categoryId: data.categoryId });

  if (!categoryOk) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "La categoría no pertenece a esta sucursal" });
  }

  if (dishId) {
    const previous = await getDishTranslatableFields({ db, dishId, restaurantId });

    const changedFields = ["name", "description"].filter(
      (field) =>
        (field === "name" && previous?.name !== data.name) ||
        (field === "description" && previous?.description !== data.description),
    );

    const statements: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [
      updateDishStatement({ db, restaurantId, dishId, data }),
    ];

    if (changedFields.length > 0) {
      statements.push(
        markTranslationsPendingUpdateStatement({
          db,
          entityId: dishId,
          entityType: "dish",
          fields: changedFields,
          restaurantId,
        }),
      );
    }

    await db.batch(statements);

    return { id: dishId };
  }

  const id = await createDish({ db, restaurantId, branchId, data });
  return { id };
}
