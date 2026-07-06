import { listCategories } from "@qmenut/db/repositories/admin-categories.repository";
import { listDishes } from "@qmenut/db/repositories/admin-dishes.repository";

import { assertBranchAccess } from "../admin-tenant/assert-branch-access";

import type { DrizzleDb } from "@qmenut/db";
import type { AdminCategory } from "@qmenut/db/repositories/admin-categories.repository";
import type { AdminDishListItem } from "@qmenut/db/repositories/admin-dishes.repository";

export interface MenuCatalog {
  categories: AdminCategory[];
  dishes: AdminDishListItem[];
}

interface GetMenuCatalogInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
}

export async function getMenuCatalog({ db, restaurantId, branchId }: GetMenuCatalogInput): Promise<MenuCatalog> {
  await assertBranchAccess({ db, restaurantId, branchId });

  const [categories, dishes] = await Promise.all([
    listCategories({ db, restaurantId, branchId }),
    listDishes({ db, restaurantId, branchId }),
  ]);

  return { categories, dishes };
}
