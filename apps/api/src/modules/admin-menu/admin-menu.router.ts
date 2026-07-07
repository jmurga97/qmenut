import { getCategoryBranchId, softDeleteCategory } from "@qmenut/db/repositories/admin-categories.repository";
import { getDishBranchId, softDeleteDish } from "@qmenut/db/repositories/admin-dishes.repository";
import {
  createIngredient,
  listAllergens,
  listIngredients,
  listTags,
} from "@qmenut/db/repositories/admin-menu-taxonomy.repository";
import { z } from "zod";

import { bumpMenuVersionForBranch } from "./bump-menu-version";
import { getDishDetail } from "./get-dish-detail";
import { getMenuCatalog } from "./get-menu-catalog";
import {
  branchScopedSchema,
  createCategorySchema,
  createDishSchema,
  createIngredientSchema,
  dishRelationsSchema,
  updateCategorySchema,
  updateDishSchema,
} from "./menu-input.schema";
import { createMenuCategory, updateMenuCategory } from "./save-category";
import { saveDish } from "./save-dish";
import { saveDishRelations } from "./save-dish-relations";
import { router, tenantProcedure } from "../../trpc/trpc";
import { requireRole } from "../admin-tenant/require-role";

const WRITE_ROLES = ["owner", "admin"] as const;

const dishDetailInputSchema = z.object({ dishId: z.string().trim().min(1) });
const categoryIdInputSchema = z.object({ categoryId: z.string().trim().min(1) });
const dishIdInputSchema = z.object({ dishId: z.string().trim().min(1) });

const categoriesRouter = router({
  list: tenantProcedure
    .input(branchScopedSchema)
    .query(({ ctx, input }) =>
      getMenuCatalog({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, branchId: input.branchId }).then(
        (catalog) => catalog.categories,
      ),
    ),
  create: tenantProcedure.input(createCategorySchema).mutation(async ({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    const result = await createMenuCategory({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
      data: input.data,
    });
    await bumpMenuVersionForBranch({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
    });
    return result;
  }),
  update: tenantProcedure.input(updateCategorySchema).mutation(async ({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    const result = await updateMenuCategory({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      categoryId: input.categoryId,
      data: input.data,
    });
    const branchId = await getCategoryBranchId({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      categoryId: input.categoryId,
    });

    if (branchId) {
      await bumpMenuVersionForBranch({ db: ctx.db, env: ctx.env, restaurantId: ctx.tenant.restaurantId, branchId });
    }

    return result;
  }),
  remove: tenantProcedure.input(categoryIdInputSchema).mutation(async ({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    const branchId = await getCategoryBranchId({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      categoryId: input.categoryId,
    });
    await softDeleteCategory({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, categoryId: input.categoryId });

    if (branchId) {
      await bumpMenuVersionForBranch({ db: ctx.db, env: ctx.env, restaurantId: ctx.tenant.restaurantId, branchId });
    }

    return { id: input.categoryId };
  }),
});

const dishesRouter = router({
  list: tenantProcedure
    .input(branchScopedSchema)
    .query(({ ctx, input }) =>
      getMenuCatalog({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, branchId: input.branchId }).then(
        (catalog) => catalog.dishes,
      ),
    ),
  detail: tenantProcedure
    .input(dishDetailInputSchema)
    .query(({ ctx, input }) =>
      getDishDetail({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, dishId: input.dishId }),
    ),
  create: tenantProcedure.input(createDishSchema).mutation(async ({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    const result = await saveDish({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
      data: input.data,
    });
    await bumpMenuVersionForBranch({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
    });
    return result;
  }),
  update: tenantProcedure.input(updateDishSchema).mutation(async ({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    const result = await saveDish({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
      dishId: input.dishId,
      data: input.data,
    });
    await bumpMenuVersionForBranch({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
    });
    return result;
  }),
  saveRelations: tenantProcedure.input(dishRelationsSchema).mutation(async ({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    const branchId = await getDishBranchId({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, dishId: input.dishId });
    await saveDishRelations({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      dishId: input.dishId,
      tagIds: input.tagIds,
      allergenIds: input.allergenIds,
      extraIngredientIds: input.extraIngredientIds,
    });

    if (branchId) {
      await bumpMenuVersionForBranch({ db: ctx.db, env: ctx.env, restaurantId: ctx.tenant.restaurantId, branchId });
    }

    return { id: input.dishId };
  }),
  remove: tenantProcedure.input(dishIdInputSchema).mutation(async ({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    const branchId = await getDishBranchId({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, dishId: input.dishId });
    await softDeleteDish({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, dishId: input.dishId });

    if (branchId) {
      await bumpMenuVersionForBranch({ db: ctx.db, env: ctx.env, restaurantId: ctx.tenant.restaurantId, branchId });
    }

    return { id: input.dishId };
  }),
});

const taxonomyRouter = router({
  tags: tenantProcedure.query(({ ctx }) => listTags({ db: ctx.db, restaurantId: ctx.tenant.restaurantId })),
  allergens: tenantProcedure.query(({ ctx }) => listAllergens({ db: ctx.db })),
  ingredients: tenantProcedure.query(({ ctx }) =>
    listIngredients({ db: ctx.db, restaurantId: ctx.tenant.restaurantId }),
  ),
  createIngredient: tenantProcedure.input(createIngredientSchema).mutation(async ({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    const id = await createIngredient({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, data: input });
    return { id };
  }),
});

export const adminMenuRouter = router({
  categories: categoriesRouter,
  dishes: dishesRouter,
  taxonomy: taxonomyRouter,
});
