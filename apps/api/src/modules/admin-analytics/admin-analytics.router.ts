import { analyticsSnapshotInputSchema } from "./admin-analytics-input.schema";
import { resolveAnalyticsPeriod } from "./analytics-period";
import { router, tenantProcedure } from "../../trpc/trpc";
import { requirePermission } from "../admin-tenant/require-permission";
import { getRestaurantAnalyticsSnapshot } from "../analytics/get-restaurant-analytics-snapshot";

export const adminAnalyticsRouter = router({
  snapshot: tenantProcedure.input(analyticsSnapshotInputSchema).query(({ ctx, input }) => {
    requirePermission(ctx.tenant, "loyalty.insights");

    const bounds = resolveAnalyticsPeriod({ period: input.period });

    return getRestaurantAnalyticsSnapshot({
      comparisonFrom: bounds.comparisonFromDay,
      comparisonTo: bounds.comparisonToDay,
      db: ctx.db,
      from: bounds.fromDay,
      restaurantId: ctx.tenant.restaurantId,
      to: bounds.toDay,
    });
  }),
});
