import { z } from "zod";

import { createCheckoutSession } from "./create-checkout-session";
import { createPortalSession } from "./create-portal-session";
import { getBillingOverview } from "./get-billing-overview";
import { requireRole } from "../admin-tenant/require-role";
import { router, tenantProcedure } from "../../trpc/trpc";

const OWNER_ONLY = ["owner"] as const;

const checkoutSchema = z.object({
  branchId: z.string().trim().min(1),
  planCode: z.enum(["basic", "business"]),
});

export const billingRouter = router({
  overview: tenantProcedure.query(({ ctx }) =>
    getBillingOverview({ db: ctx.db, restaurantId: ctx.tenant.restaurantId }),
  ),
  checkout: tenantProcedure.input(checkoutSchema).mutation(({ ctx, input }) => {
    requireRole(ctx.tenant, OWNER_ONLY);
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
    requireRole(ctx.tenant, OWNER_ONLY);
    return createPortalSession({ db: ctx.db, env: ctx.env, restaurantId: ctx.tenant.restaurantId });
  }),
});
