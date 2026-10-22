import { resolveActiveMembership } from "@qmenut/db/repositories/restaurant-users.repository";
import { isInternalSupportEmail } from "@qmenut/permissions";
import { initTRPC, TRPCError } from "@trpc/server";

import { hasPlanFeature, requireFeature } from "../lib/billing/entitlement";
import { syncTranslationsAfterSave } from "../modules/admin-translations/sync-translations";

import type { TrpcContext } from "./context";
import type { RestaurantRoleCode } from "@qmenut/db/repositories/restaurant-users.repository";
import type { PlanFeature } from "@qmenut/permissions";

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

export const tenantProcedure = protectedProcedure.use(async ({ ctx, next, path, type }) => {
  const membership = await resolveActiveMembership({
    activeRestaurantId: ctx.session.session.activeRestaurantId ?? null,
    db: ctx.db,
    userId: ctx.session.user.id,
  });

  if (!membership) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No hay ninguna membresía activa en un restaurante" });
  }

  // Basic is owner-only: other members keep their membership but lose access until the restaurant upgrades.
  if (
    membership.roleCode !== "owner" &&
    !isInternalSupportEmail(ctx.session.user.email) &&
    !(await hasPlanFeature({ db: ctx.db, tenant: membership }, { feature: "users" }))
  ) {
    throw new TRPCError({ code: "FORBIDDEN", message: "El restaurante está en el plan Básico" });
  }

  const tenant: TenantContext = {
    membershipId: membership.id,
    restaurantId: membership.restaurantId,
    roleCode: membership.roleCode,
  };

  const result = await next({
    ctx: {
      ...ctx,
      tenant,
    },
  });
  if (result.ok && type === "mutation") {
    await syncTranslationsAfterSave({ path, db: ctx.db, env: ctx.env, restaurantId: tenant.restaurantId });
  }
  return result;
});

/** Tenant procedure for a restaurant-wide plan feature (see RESTAURANT_FEATURES). */
export function featureProcedure(feature: PlanFeature) {
  return tenantProcedure.use(async ({ ctx, next }) => {
    await requireFeature(ctx, { feature });
    return next();
  });
}
