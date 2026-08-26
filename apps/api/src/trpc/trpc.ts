import { resolveActiveMembership } from "@qmenut/db/repositories/restaurant-users.repository";
import { initTRPC, TRPCError } from "@trpc/server";

import type { TrpcContext } from "./context";
import type { RestaurantRoleCode } from "@qmenut/db/repositories/restaurant-users.repository";

export interface TenantContext {
  membershipId: string;
  restaurantId: string;
  roleCode: RestaurantRoleCode;
}

const t = initTRPC.context<TrpcContext>().create();

export const createCallerFactory = t.createCallerFactory;
export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const session = await ctx.getSession();

  if (!session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      session,
    },
  });
});

export const tenantProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const membership = await resolveActiveMembership({
    activeRestaurantId: ctx.session.session.activeRestaurantId ?? null,
    db: ctx.db,
    userId: ctx.session.user.id,
  });

  if (!membership) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No hay ninguna membresía activa en un restaurante" });
  }

  const tenant: TenantContext = {
    membershipId: membership.id,
    restaurantId: membership.restaurantId,
    roleCode: membership.roleCode,
  };

  return next({
    ctx: {
      ...ctx,
      tenant,
    },
  });
});
