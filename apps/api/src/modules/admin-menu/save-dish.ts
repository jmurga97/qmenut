import { TRPCError } from "@trpc/server";
import {
  categoryBelongsToBranch,
  createDish,
  getDishTranslatableFields,
  updateDish,
} from "@qmenut/db/repositories/admin-dishes.repository";
import { markTranslationsPendingUpdate } from "@qmenut/db/repositories/translations.repository";

import { assertBranchAccess } from "../admin-tenant/assert-branch-access";

import type { DrizzleDb } from "@qmenut/db";
import type { DishWriteData } from "@qmenut/db/repositories/admin-dishes.repository";

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
  await assertBranchAccess({ db, restaurantId, branchId });

  const categoryOk = await categoryBelongsToBranch({ db, branchId, categoryId: data.categoryId });

  if (!categoryOk) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Category does not belong to this branch" });
  }

  if (dishId) {
    const previous = await getDishTranslatableFields({ db, dishId, restaurantId });

    await updateDish({ db, restaurantId, dishId, data });

    const changedFields = ["name", "description"].filter(
      (field) =>
        (field === "name" && previous?.name !== data.name) ||
        (field === "description" && previous?.description !== data.description),
    );

    if (changedFields.length > 0) {
      await markTranslationsPendingUpdate({
        db,
        entityId: dishId,
        entityType: "dish",
        fields: changedFields,
        restaurantId,
      });
    }

    return { id: dishId };
  }

  const id = await createDish({ db, restaurantId, branchId, data });
  return { id };
}
