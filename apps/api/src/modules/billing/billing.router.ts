import { z } from "zod";

import { createCheckoutSession } from "./create-checkout-session";
import { createPortalSession } from "./create-portal-session";
import { getBillingOverview } from "./get-billing-overview";
import { router, tenantProcedure } from "../../trpc/trpc";
import { requirePermission } from "../admin-tenant/require-permission";

const checkoutSchema = z.object({
  branchId: z.string().trim().min(1),
  planCode: z.enum(["basic", "business"]),
});

export const billingRouter = router({
  overview: tenantProcedure.query(({ ctx }) => {
    requirePermission(ctx.tenant, "billing.manage");
    return getBillingOverview({ db: ctx.db, restaurantId: ctx.tenant.restaurantId });
  }),
  checkout: tenantProcedure.input(checkoutSchema).mutation(({ ctx, input }) => {
    requirePermission(ctx.tenant, "billing.manage");
    return createCheckoutSession({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
      userEmail: ctx.session.user.email,
      branchId: input.branchId,
      planCode: input.planCode,
    });
  }),
  portal: tenantProcedure.mutation(({ ctx }) => {
    requirePermission(ctx.tenant, "billing.manage");
    return createPortalSession({ db: ctx.db, env: ctx.env, restaurantId: ctx.tenant.restaurantId });
  }),
});
