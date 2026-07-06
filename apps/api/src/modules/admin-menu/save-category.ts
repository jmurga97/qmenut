import {
  createCategory,
  getCategoryTranslatableFields,
  updateCategory,
} from "@qmenut/db/repositories/admin-categories.repository";
import { markTranslationsPendingUpdate } from "@qmenut/db/repositories/translations.repository";

import { assertBranchAccess } from "../admin-tenant/assert-branch-access";

import type { DrizzleDb } from "@qmenut/db";
import type { CategoryWriteData } from "@qmenut/db/repositories/admin-categories.repository";

interface CreateCategoryInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
  data: CategoryWriteData;
}

export async function createMenuCategory({
  db,
  restaurantId,
  branchId,
  data,
}: CreateCategoryInput): Promise<{ id: string }> {
  await assertBranchAccess({ db, restaurantId, branchId });
  const id = await createCategory({ db, restaurantId, branchId, data });
  return { id };
}

interface UpdateCategoryInput {
  db: DrizzleDb;
  restaurantId: string;
  categoryId: string;
  data: CategoryWriteData;
}

export async function updateMenuCategory({
  db,
  restaurantId,
  categoryId,
  data,
}: UpdateCategoryInput): Promise<{ id: string }> {
  const previous = await getCategoryTranslatableFields({ categoryId, db, restaurantId });

  await updateCategory({ db, restaurantId, categoryId, data });

  const changedFields = ["name", "description"].filter(
    (field) =>
      (field === "name" && previous?.name !== data.name) ||
      (field === "description" && previous?.description !== data.description),
  );

  if (changedFields.length > 0) {
    await markTranslationsPendingUpdate({
      db,
      entityId: categoryId,
      entityType: "category",
      fields: changedFields,
      restaurantId,
    });
  }

  return { id: categoryId };
}
