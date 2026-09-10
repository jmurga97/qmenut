import { listCategories } from "@qmenut/db/repositories/admin-categories.repository";
import { listDishes } from "@qmenut/db/repositories/admin-dishes.repository";

import { getTranslationTexts, translateText } from "./translation-overlay";
import { assertBranchAccess } from "../admin-tenant/assert-branch-access";

import type { DrizzleDb } from "@qmenut/db/client";
import type { AdminCategory } from "@qmenut/db/repositories/admin-categories.repository";
import type { AdminDishListItem } from "@qmenut/db/repositories/admin-dishes.repository";

export interface MenuCatalog {
  categories: AdminCategory[];
  dishes: AdminDishListItem[];
}

interface GetMenuCatalogInput {
  db: DrizzleDb;
  languageCode?: string;
  restaurantId: string;
  branchId: string;
}

export async function getMenuCatalog({
  db,
  languageCode,
  restaurantId,
  branchId,
}: GetMenuCatalogInput): Promise<MenuCatalog> {
  await assertBranchAccess({ db, restaurantId, branchId });

  const [categories, dishes] = await Promise.all([
    listCategories({ db, restaurantId, branchId }),
    listDishes({ db, restaurantId, branchId }),
  ]);

  if (!languageCode) {
    return { categories, dishes };
  }

  const texts = await getTranslationTexts({
    db,
    ids: [...categories.map((category) => category.id), ...dishes.map((dish) => dish.id)],
    languageCode,
    restaurantId,
  });

  return {
    categories: categories.map((category) => ({
      ...category,
      description: translateText({
        entityId: category.id,
        fallback: category.description,
        field: "description",
        texts,
      }),
      name: translateText({ entityId: category.id, fallback: category.name, field: "name", texts }),
    })),
    dishes: dishes.map((dish) => ({
      ...dish,
      name: translateText({ entityId: dish.id, fallback: dish.name, field: "name", texts }),
    })),
  };
}
