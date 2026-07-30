import {
  getPromotion,
  getPromotionBranchId,
  listPromotions,
  softDeletePromotion,
} from "@qmenut/db/repositories/admin-promotions.repository";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createPromotionSchema, updatePromotionSchema } from "./promotion-input.schema";
import { createBranchPromotion, updateBranchPromotion } from "./save-promotion";
import { bumpPublicContentVersionForBranch } from "../../lib/public-content-version";
import { router, tenantProcedure } from "../../trpc/trpc";
import { assertBranchAccess } from "../admin-tenant/assert-branch-access";
import { requirePermission } from "../admin-tenant/require-permission";

const branchIdSchema = z.object({ branchId: z.string().trim().min(1) });
const promotionIdSchema = z.object({ promotionId: z.string().trim().min(1) });

export const adminPromotionsRouter = router({
  list: tenantProcedure.input(branchIdSchema).query(async ({ ctx, input }) => {
    await assertBranchAccess({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, branchId: input.branchId });
    return listPromotions({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, branchId: input.branchId });
  }),
  get: tenantProcedure.input(promotionIdSchema).query(async ({ ctx, input }) => {
    const promotion = await getPromotion({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      promotionId: input.promotionId,
    });

    if (!promotion) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Promoción no encontrada" });
    }

    return promotion;
  }),
  create: tenantProcedure.input(createPromotionSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "promotions.write");
    const result = await createBranchPromotion({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
      data: input.data,
      targets: input.targets,
    });
    await bumpPublicContentVersionForBranch({
      branchId: input.branchId,
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
    });
    return result;
  }),
  update: tenantProcedure.input(updatePromotionSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "promotions.write");
    const branchId = await getPromotionBranchId({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      promotionId: input.promotionId,
    });
    const result = await updateBranchPromotion({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      promotionId: input.promotionId,
      data: input.data,
      targets: input.targets,
    });

    if (branchId) {
      await bumpPublicContentVersionForBranch({
        branchId,
        db: ctx.db,
        env: ctx.env,
        restaurantId: ctx.tenant.restaurantId,
      });
    }

    return result;
  }),
  remove: tenantProcedure.input(promotionIdSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "promotions.write");
    const branchId = await getPromotionBranchId({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      promotionId: input.promotionId,
    });
    await softDeletePromotion({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, promotionId: input.promotionId });

    if (branchId) {
      await bumpPublicContentVersionForBranch({
        branchId,
        db: ctx.db,
        env: ctx.env,
        restaurantId: ctx.tenant.restaurantId,
      });
    }

    return { id: input.promotionId };
  }),
});
