import {
  getLoyaltyProgram,
  listRewards,
  saveLoyaltyProgram,
  softDeleteReward,
} from "@qmenut/db/repositories/loyalty-admin.repository";

import {
  listCustomersInputSchema,
  programInputSchema,
  rejectRedemptionInputSchema,
  undoInputSchema,
  validateRedemptionInputSchema,
  venueCodeInputSchema,
  visitsChartInputSchema,
} from "./admin-loyalty-input.schema";
import { getVenueCode } from "./get-venue-code";
import { getInsightsVisitsChart, getLoyaltyInsightsSummary, listInsightsCustomers } from "./insights";
import { pendingRedemptions } from "./pending-redemptions";
import { rejectRedemption } from "./reject-redemption";
import { createRewardSchema, rewardIdInputSchema, updateRewardSchema } from "./reward-input.schema";
import { saveReward } from "./save-reward";
import { undoLoyaltyAction } from "./undo-loyalty-action";
import { validateRedemption } from "./validate-redemption";
import { bumpPublicContentVersionForRestaurant } from "../../lib/public-content-version";
import { featureProcedure, router } from "../../trpc/trpc";
import { requirePermission } from "../admin-tenant/require-permission";

const loyaltyProcedure = featureProcedure("loyalty");

const insightsRouter = router({
  summary: loyaltyProcedure.query(({ ctx }) => {
    requirePermission(ctx.tenant, "loyalty.insights");

    return getLoyaltyInsightsSummary({ db: ctx.db, restaurantId: ctx.tenant.restaurantId });
  }),
  customers: loyaltyProcedure.input(listCustomersInputSchema).query(({ ctx, input }) => {
    requirePermission(ctx.tenant, "loyalty.insights");

    return listInsightsCustomers({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      search: input.search ?? null,
      sortBy: input.sortBy,
      sortDir: input.sortDir,
      page: input.page,
      pageSize: input.pageSize,
      inactiveDays: input.inactiveDays ?? null,
    });
  }),
  visitsChart: loyaltyProcedure.input(visitsChartInputSchema).query(({ ctx, input }) => {
    requirePermission(ctx.tenant, "loyalty.insights");

    return getInsightsVisitsChart({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      from: input.from,
      to: input.to,
    });
  }),
});

export const adminLoyaltyRouter = router({
  getProgram: loyaltyProcedure.query(async ({ ctx }) => {
    requirePermission(ctx.tenant, "loyalty.manage");
    const [program, rewards] = await Promise.all([
      getLoyaltyProgram({ db: ctx.db, restaurantId: ctx.tenant.restaurantId }),
      listRewards({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, includeInactive: true }),
    ]);

    return { program, rewards };
  }),
  saveProgram: loyaltyProcedure.input(programInputSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "loyalty.manage");

    await saveLoyaltyProgram({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      isActive: input.isActive,
      ticketMedio: input.ticketMedio,
    });

    await bumpPublicContentVersionForRestaurant({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
    });
  }),
  createReward: loyaltyProcedure.input(createRewardSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "loyalty.manage");

    const result = await saveReward({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, data: input.data });
    await bumpPublicContentVersionForRestaurant({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
    });

    return result;
  }),
  updateReward: loyaltyProcedure.input(updateRewardSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "loyalty.manage");

    const result = await saveReward({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      rewardId: input.rewardId,
      data: input.data,
    });
    await bumpPublicContentVersionForRestaurant({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
    });

    return result;
  }),
  deleteReward: loyaltyProcedure.input(rewardIdInputSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "loyalty.manage");
    await softDeleteReward({ db: ctx.db, restaurantId: ctx.tenant.restaurantId, rewardId: input.rewardId });
    await bumpPublicContentVersionForRestaurant({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
    });

    return { id: input.rewardId };
  }),
  venueCode: loyaltyProcedure.input(venueCodeInputSchema).query(({ ctx, input }) => {
    requirePermission(ctx.tenant, "loyalty.operate");
    return getVenueCode({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
      branchId: input.branchId,
    });
  }),
  pendingRedemptions: loyaltyProcedure.query(({ ctx }) => {
    requirePermission(ctx.tenant, "loyalty.operate");
    return pendingRedemptions({ db: ctx.db, restaurantId: ctx.tenant.restaurantId });
  }),
  rejectRedemption: loyaltyProcedure.input(rejectRedemptionInputSchema).mutation(({ ctx, input }) => {
    requirePermission(ctx.tenant, "loyalty.operate");
    return rejectRedemption({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      redemptionId: input.redemptionId,
    });
  }),
  validateRedemption: loyaltyProcedure.input(validateRedemptionInputSchema).mutation(({ ctx, input }) => {
    requirePermission(ctx.tenant, "loyalty.operate");
    return validateRedemption({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      redemptionId: input.redemptionId,
      branchId: input.branchId,
      validatedBy: ctx.tenant.membershipId,
    });
  }),
  undo: loyaltyProcedure.input(undoInputSchema).mutation(({ ctx, input }) => {
    requirePermission(ctx.tenant, "loyalty.operate");
    return undoLoyaltyAction({
      db: ctx.db,
      restaurantId: ctx.tenant.restaurantId,
      transactionId: input.transactionId,
      branchId: input.branchId,
    });
  }),
  insights: insightsRouter,
});
