import { getCategoryContext, softDeleteCategory } from "@qmenut/db/repositories/admin-categories.repository";
import { getDishContext, setDishAvailability, softDeleteDish } from "@qmenut/db/repositories/admin-dishes.repository";
import {
  createIngredient,
  listAllergens,
  listIngredients,
  listTags,
} from "@qmenut/db/repositories/admin-menu-taxonomy.repository";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

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
import { bumpPublicContentVersionForBranch } from "../../lib/public-content-version";
import { router, tenantProcedure } from "../../trpc/trpc";
import { dispatchImageAssignments } from "../admin-images/image-finalization";
import { imageSaveOperation } from "../admin-images/image-save-operation";
import { prepareMenuImageSave } from "../admin-images/prepare-menu-image-save";
import { assertBranchAccess } from "../admin-tenant/assert-branch-access";
import { requirePermission } from "../admin-tenant/require-permission";

const dishDetailInputSchema = z.object({ dishId: z.string().trim().min(1) });
const categoryIdInputSchema = z.object({ categoryId: z.string().trim().min(1) });
const dishIdInputSchema = z.object({ dishId: z.string().trim().min(1) });
const setDishAvailabilityInputSchema = z.object({
  branchId: z.string().trim().min(1),
  dishId: z.string().trim().min(1),
  isActive: z.boolean(),
});

const categoriesRouter = router({
  list: tenantProcedure.input(branchScopedSchema).query(async ({ ctx, input }) => {
    const catalog = await getMenuCatalog({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
    });
    return catalog.categories;
  }),
  create: tenantProcedure.input(createCategorySchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "menu.write");
    await assertBranchAccess({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
    });
    return imageSaveOperation({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      operationId: input.operationId,
      scope: "categoriesRouter.create",
      input,
      save: async ({ entityId, statements }) => {
        const image = await prepareMenuImageSave({
          db: ctx.db,
          env: ctx.env,
          restaurantId: ctx.tenant.restaurantId,
          branchId: input.branchId,
          entityId,
          purpose: "categoryImage",
          existingUrl: null,
          data: input.data,
        });
        const result = await createMenuCategory({
          db: ctx.db,
          restaurantId: ctx.tenant.restaurantId,
          branchId: input.branchId,
          data: { ...input.data, imageUrl: image.imageUrl },
          preserveImage: image.preserveImage,
          entityId,
          statements: [...statements, ...image.statements],
        });
        await bumpPublicContentVersionForBranch({
          db: ctx.db,
          env: ctx.env,
          restaurantId: ctx.tenant.restaurantId,
          branchId: input.branchId,
        });
        await dispatchImageAssignments(ctx.env);
        return result;
      },
    });
  }),
  update: tenantProcedure.input(updateCategorySchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "menu.write");
    const categoryContext = await getCategoryContext({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      categoryId: input.categoryId,
    });
    if (!categoryContext) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Categoría no encontrada" });
    }
    return imageSaveOperation({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      operationId: input.operationId,
      scope: "categoriesRouter.update",
      input,
      entityId: input.categoryId,
      save: async ({ entityId, statements }) => {
        const image = await prepareMenuImageSave({
          db: ctx.db,
          env: ctx.env,
          restaurantId: ctx.tenant.restaurantId,
          branchId: categoryContext.branchId,
          entityId,
          purpose: "categoryImage",
          existingUrl: categoryContext.imageUrl,
          data: input.data,
        });
        const result = await updateMenuCategory({
          db: ctx.db,
          restaurantId: ctx.tenant.restaurantId,
          categoryId: input.categoryId,
          data: { ...input.data, imageUrl: image.imageUrl },
          preserveImage: image.preserveImage,
          entityId,
          statements: [...statements, ...image.statements],
        });

        await bumpPublicContentVersionForBranch({
          db: ctx.db,
          env: ctx.env,
          restaurantId: ctx.tenant.restaurantId,
          branchId: categoryContext.branchId,
        });

        await dispatchImageAssignments(ctx.env);
        return result;
      },
    });
  }),
  remove: tenantProcedure.input(categoryIdInputSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "menu.write");
    const categoryContext = await getCategoryContext({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      categoryId: input.categoryId,
    });
    await softDeleteCategory({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, categoryId: input.categoryId });

    if (categoryContext) {
      await bumpPublicContentVersionForBranch({
        db: ctx.db,
        env: ctx.env,
        restaurantId: ctx.tenant.restaurantId,
        branchId: categoryContext.branchId,
      });
    }

    return { id: input.categoryId };
  }),
});

const dishesRouter = router({
  list: tenantProcedure.input(branchScopedSchema).query(async ({ ctx, input }) => {
    const catalog = await getMenuCatalog({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
    });
    return catalog.dishes;
  }),
  detail: tenantProcedure
    .input(dishDetailInputSchema)
    .query(({ ctx, input }) =>
      getDishDetail({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, dishId: input.dishId }),
    ),
  create: tenantProcedure.input(createDishSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "menu.write");
    await assertBranchAccess({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
    });
    return imageSaveOperation({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      operationId: input.operationId,
      scope: "dishesRouter.create",
      input,
      save: async ({ entityId, statements }) => {
        const image = await prepareMenuImageSave({
          db: ctx.db,
          env: ctx.env,
          restaurantId: ctx.tenant.restaurantId,
          branchId: input.branchId,
          entityId,
          purpose: "dishImage",
          existingUrl: null,
          data: input.data,
        });
        const result = await saveDish({
          db: ctx.db,
          restaurantId: ctx.tenant.restaurantId,
          branchId: input.branchId,
          data: { ...input.data, imageUrl: image.imageUrl },
          preserveImage: image.preserveImage,
          entityId,
          statements: [...statements, ...image.statements],
        });
        await bumpPublicContentVersionForBranch({
          db: ctx.db,
          env: ctx.env,
          restaurantId: ctx.tenant.restaurantId,
          branchId: input.branchId,
        });
        await dispatchImageAssignments(ctx.env);
        return result;
      },
    });
  }),
  update: tenantProcedure.input(updateDishSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "menu.write");
    const dishContext = await getDishContext({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      dishId: input.dishId,
    });
    if (!dishContext || dishContext.branchId !== input.branchId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Plato no encontrado" });
    }
    return imageSaveOperation({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      operationId: input.operationId,
      scope: "dishesRouter.update",
      input,
      entityId: input.dishId,
      save: async ({ entityId, statements }) => {
        const image = await prepareMenuImageSave({
          db: ctx.db,
          env: ctx.env,
          restaurantId: ctx.tenant.restaurantId,
          branchId: input.branchId,
          entityId,
          purpose: "dishImage",
          existingUrl: dishContext.imageUrl,
          data: input.data,
        });
        const result = await saveDish({
          db: ctx.db,
          restaurantId: ctx.tenant.restaurantId,
          branchId: input.branchId,
          dishId: input.dishId,
          data: { ...input.data, imageUrl: image.imageUrl },
          preserveImage: image.preserveImage,
          entityId,
          statements: [...statements, ...image.statements],
        });
        await bumpPublicContentVersionForBranch({
          db: ctx.db,
          env: ctx.env,
          restaurantId: ctx.tenant.restaurantId,
          branchId: input.branchId,
        });
        await dispatchImageAssignments(ctx.env);
        return result;
      },
    });
  }),
  saveRelations: tenantProcedure.input(dishRelationsSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "menu.write");
    const dishContext = await getDishContext({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      dishId: input.dishId,
    });
    if (!dishContext) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Plato no encontrado" });
    }
    await saveDishRelations({
      db: ctx.db,
      dishId: input.dishId,
      restaurantId: ctx.tenant.restaurantId,
      tagIds: input.tagIds,
      allergenIds: input.allergenIds,
      extraIngredientIds: input.extraIngredientIds,
    });

    await bumpPublicContentVersionForBranch({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
      branchId: dishContext.branchId,
    });

    return { id: input.dishId };
  }),
  remove: tenantProcedure.input(dishIdInputSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "menu.write");
    const dishContext = await getDishContext({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      dishId: input.dishId,
    });
    await softDeleteDish({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, dishId: input.dishId });

    if (dishContext) {
      await bumpPublicContentVersionForBranch({
        db: ctx.db,
        env: ctx.env,
        restaurantId: ctx.tenant.restaurantId,
        branchId: dishContext.branchId,
      });
    }

    return { id: input.dishId };
  }),
  setAvailability: tenantProcedure.input(setDishAvailabilityInputSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "menu.toggleDishAvailability");
    await assertBranchAccess({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
    });
    await setDishAvailability({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
      dishId: input.dishId,
      isActive: input.isActive,
    });
    await bumpPublicContentVersionForBranch({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
    });
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
    requirePermission(ctx.tenant, "menu.write");
    const id = await createIngredient({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, data: input });
    return { id };
  }),
});

export const adminMenuRouter = router({
  categories: categoriesRouter,
  dishes: dishesRouter,
  taxonomy: taxonomyRouter,
});
