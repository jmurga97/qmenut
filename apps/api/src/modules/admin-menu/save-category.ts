import {
  createCategoryStatement,
  getCategoryTranslatableFields,
  updateCategoryStatement,
} from "@qmenut/db/repositories/admin-categories.repository";
import { markTranslationsPendingUpdateStatement } from "@qmenut/db/repositories/translations.repository";

import type { DrizzleDb } from "@qmenut/db/client";
import type { CategoryWriteData } from "@qmenut/db/repositories/admin-categories.repository";
import type { BatchItem } from "drizzle-orm/batch";

interface CreateCategoryInput {
  entityId?: string;
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
  data: CategoryWriteData;
  statements?: BatchItem<"sqlite">[];
  preserveImage?: boolean;
}

export async function createMenuCategory({
  db,
  restaurantId,
  branchId,
  data,
  entityId = crypto.randomUUID(),
  statements = [],
}: CreateCategoryInput): Promise<{ id: string }> {
  // The menu router authorizes the branch before calling this writer.
  await db.batch([createCategoryStatement({ db, restaurantId, branchId, data, id: entityId }), ...statements]);
  return { id: entityId };
}

interface UpdateCategoryInput {
  entityId?: string;
  db: DrizzleDb;
  restaurantId: string;
  categoryId: string;
  data: CategoryWriteData;
  statements?: BatchItem<"sqlite">[];
  preserveImage?: boolean;
}

export async function updateMenuCategory({
  db,
  restaurantId,
  categoryId,
  data,
  statements: extraStatements = [],
  preserveImage,
}: UpdateCategoryInput): Promise<{ id: string }> {
  const previous = await getCategoryTranslatableFields({ categoryId, db, restaurantId });

  const changedFields = ["name", "description"].filter(
    (field) =>
      (field === "name" && previous?.name !== data.name) ||
      (field === "description" && previous?.description !== data.description),
  );

  const statements: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [
    updateCategoryStatement({ db, restaurantId, categoryId, data, preserveImage }),
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

  statements.push(...extraStatements);
  await db.batch(statements);

  return { id: categoryId };
}
