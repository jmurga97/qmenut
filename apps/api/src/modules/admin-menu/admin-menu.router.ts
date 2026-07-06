import { z } from "zod";
import { softDeleteCategory } from "@qmenut/db/repositories/admin-categories.repository";
import { softDeleteDish } from "@qmenut/db/repositories/admin-dishes.repository";
import {
  createIngredient,
  listAllergens,
  listIngredients,
  listTags,
} from "@qmenut/db/repositories/admin-menu-taxonomy.repository";

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
import { requireRole } from "../admin-tenant/require-role";
import { router, tenantProcedure } from "../../trpc/trpc";

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
  create: tenantProcedure.input(createCategorySchema).mutation(({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    return createMenuCategory({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
      data: input.data,
    });
  }),
  update: tenantProcedure.input(updateCategorySchema).mutation(({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    return updateMenuCategory({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      categoryId: input.categoryId,
      data: input.data,
    });
  }),
  remove: tenantProcedure.input(categoryIdInputSchema).mutation(async ({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    await softDeleteCategory({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, categoryId: input.categoryId });
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
  create: tenantProcedure.input(createDishSchema).mutation(({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    return saveDish({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
      data: input.data,
    });
  }),
  update: tenantProcedure.input(updateDishSchema).mutation(({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    return saveDish({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
      dishId: input.dishId,
      data: input.data,
    });
  }),
  saveRelations: tenantProcedure.input(dishRelationsSchema).mutation(async ({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    await saveDishRelations({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      dishId: input.dishId,
      tagIds: input.tagIds,
      allergenIds: input.allergenIds,
      extraIngredientIds: input.extraIngredientIds,
    });
    return { id: input.dishId };
  }),
  remove: tenantProcedure.input(dishIdInputSchema).mutation(async ({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    await softDeleteDish({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, dishId: input.dishId });
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
