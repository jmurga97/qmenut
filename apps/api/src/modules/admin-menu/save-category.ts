import {
  createCategory,
  getCategoryTranslatableFields,
  updateCategoryStatement,
} from "@qmenut/db/repositories/admin-categories.repository";
import { markTranslationsPendingUpdateStatement } from "@qmenut/db/repositories/translations.repository";

import type { DrizzleDb } from "@qmenut/db/client";
import type { CategoryWriteData } from "@qmenut/db/repositories/admin-categories.repository";
import type { BatchItem } from "drizzle-orm/batch";

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
  // The menu router authorizes the branch before calling this writer.
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

  const changedFields = ["name", "description"].filter(
    (field) =>
      (field === "name" && previous?.name !== data.name) ||
      (field === "description" && previous?.description !== data.description),
  );

  const statements: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [
    updateCategoryStatement({ db, restaurantId, categoryId, data }),
  ];

  if (changedFields.length > 0) {
    statements.push(
      markTranslationsPendingUpdateStatement({
        db,
        entityId: categoryId,
        entityType: "category",
        fields: changedFields,
        restaurantId,
      }),
    );
  }

  await db.batch(statements);

  return { id: categoryId };
}
