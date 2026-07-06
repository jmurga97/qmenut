import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getPromotion, listPromotions, softDeletePromotion } from "@qmenut/db/repositories/admin-promotions.repository";

import { createPromotionSchema, updatePromotionSchema } from "./promotion-input.schema";
import { createBranchPromotion, updateBranchPromotion } from "./save-promotion";
import { assertBranchAccess } from "../admin-tenant/assert-branch-access";
import { requireRole } from "../admin-tenant/require-role";
import { router, tenantProcedure } from "../../trpc/trpc";

const WRITE_ROLES = ["owner", "admin"] as const;
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
      throw new TRPCError({ code: "NOT_FOUND", message: "Promotion not found" });
    }

    return promotion;
  }),
  create: tenantProcedure.input(createPromotionSchema).mutation(({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    return createBranchPromotion({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
      data: input.data,
      targets: input.targets,
    });
  }),
  update: tenantProcedure.input(updatePromotionSchema).mutation(({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    return updateBranchPromotion({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      promotionId: input.promotionId,
      data: input.data,
      targets: input.targets,
    });
  }),
  remove: tenantProcedure.input(promotionIdSchema).mutation(async ({ ctx, input }) => {
    requireRole(ctx.tenant, WRITE_ROLES);
    await softDeletePromotion({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, promotionId: input.promotionId });
    return { id: input.promotionId };
  }),
});
