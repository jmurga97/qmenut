import { connectStripeAccount } from "./connect-stripe-account";
import { getPaymentsAccount } from "./get-payments-account";
import { router, tenantProcedure } from "../../trpc/trpc";
import { requirePermission } from "../admin-tenant/require-permission";

export const paymentsRouter = router({
  account: tenantProcedure.query(({ ctx }) => {
    requirePermission(ctx.tenant, "billing.manage");
    return getPaymentsAccount({ db: ctx.db, env: ctx.env, restaurantId: ctx.tenant.restaurantId });
  }),
  connect: tenantProcedure.mutation(({ ctx }) => {
    requirePermission(ctx.tenant, "billing.manage");
    return connectStripeAccount({
      db: ctx.db,
      env: ctx.env,
      restaurantId: ctx.tenant.restaurantId,
      userEmail: ctx.session.user.email,
    });
  }),
});
