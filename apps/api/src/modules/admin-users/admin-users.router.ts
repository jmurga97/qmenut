import {
  createRestaurantUser,
  getRestaurantUser,
  listRestaurantUsers,
  setRestaurantUserActive,
  updateRestaurantUserInviteStatus,
  updateRestaurantUserRole,
} from "@qmenut/db/repositories/admin-users.repository";
import { getRestaurantById } from "@qmenut/db/repositories/restaurants.repository";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { sendUserInviteEmail } from "./send-user-invite-email";
import { router, tenantProcedure } from "../../trpc/trpc";
import { requirePermission } from "../admin-tenant/require-permission";

const manageableRoleSchema = z.enum(["admin", "staff"]);
const membershipIdSchema = z.object({ membershipId: z.string().trim().min(1) });
const createUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().trim().max(320),
  roleCode: manageableRoleSchema,
});
const updateRoleSchema = membershipIdSchema.extend({ roleCode: manageableRoleSchema });
const setActiveSchema = membershipIdSchema.extend({ isActive: z.boolean() });

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertEditableMembership(roleCode: string): void {
  if (roleCode === "owner") {
    throw new TRPCError({ code: "FORBIDDEN", message: "La membresía owner está protegida" });
  }
}

async function getRestaurantName(
  restaurantId: string,
  db: Parameters<typeof getRestaurantById>[0]["db"],
): Promise<string> {
  const restaurant = await getRestaurantById({ db, restaurantId });
  if (!restaurant) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Restaurante no encontrado" });
  }

  return restaurant.name;
}

async function sendAndPersistInvite({
  db,
  email,
  membershipId,
  panelUrl,
  restaurantId,
  restaurantName,
  userName,
  emailWorker,
}: {
  db: Parameters<typeof getRestaurantById>[0]["db"];
  email: string;
  emailWorker: Parameters<typeof sendUserInviteEmail>[0]["emailWorker"];
  membershipId: string;
  panelUrl: string;
  restaurantId: string;
  restaurantName: string;
  userName: string;
}) {
  const attemptAt = Date.now();
  const result = await sendUserInviteEmail({
    emailWorker,
    panelUrl,
    recipientEmail: email,
    restaurantName,
    userName,
  });
  const persisted = await updateRestaurantUserInviteStatus({
    db,
    inviteLastAttemptAt: attemptAt,
    inviteLastErrorCode: result.errorCode,
    inviteSentAt: result.errorCode ? null : Date.now(),
    inviteStatus: result.errorCode ? "failed" : "sent",
    membershipId,
    restaurantId,
  });

  if (!persisted) {
    console.error("No se pudo guardar el estado de invitación", { errorCode: "INVITE_STATE_PERSIST_FAILED" });
  }

  return result;
}

export const adminUsersRouter = router({
  list: tenantProcedure.query(async ({ ctx }) => {
    requirePermission(ctx.tenant, "users.manage");
    return listRestaurantUsers({ db: ctx.db, restaurantId: ctx.tenant.restaurantId });
  }),

  create: tenantProcedure.input(createUserSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "users.manage");
    const email = normalizeEmail(input.email);
    const created = await createRestaurantUser({
      db: ctx.db,
      email,
      name: input.name,
      restaurantId: ctx.tenant.restaurantId,
      roleCode: input.roleCode,
    });

    if (!created.created) {
      return { created: false, invitation: { errorCode: null, status: created.user.inviteStatus }, user: created.user };
    }

    const restaurantName = await getRestaurantName(ctx.tenant.restaurantId, ctx.db);
    const invitation = await sendAndPersistInvite({
      db: ctx.db,
      email: created.user.email,
      emailWorker: ctx.env.EMAIL_WORKER,
      membershipId: created.user.membershipId,
      panelUrl: new URL("/login", ctx.env.ADMIN_APP_URL).href,
      restaurantId: ctx.tenant.restaurantId,
      restaurantName,
      userName: created.user.name,
    });
    const user =
      (await getRestaurantUser({
        db: ctx.db,
        membershipId: created.user.membershipId,
        restaurantId: ctx.tenant.restaurantId,
      })) ?? created.user;

    return { created: true, invitation: { errorCode: invitation.errorCode, status: user.inviteStatus }, user };
  }),

  updateRole: tenantProcedure.input(updateRoleSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "users.manage");
    const membership = await getRestaurantUser({
      db: ctx.db,
      membershipId: input.membershipId,
      restaurantId: ctx.tenant.restaurantId,
    });
    if (!membership) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Membresía no encontrada" });
    }
    assertEditableMembership(membership.roleCode);
    await updateRestaurantUserRole({
      db: ctx.db,
      membershipId: input.membershipId,
      roleCode: input.roleCode,
      restaurantId: ctx.tenant.restaurantId,
    });
    return getRestaurantUser({ db: ctx.db, membershipId: input.membershipId, restaurantId: ctx.tenant.restaurantId });
  }),

  setActive: tenantProcedure.input(setActiveSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "users.manage");
    if (!input.isActive && input.membershipId === ctx.tenant.membershipId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No puedes desactivar tu propia membresía" });
    }
    const membership = await getRestaurantUser({
      db: ctx.db,
      membershipId: input.membershipId,
      restaurantId: ctx.tenant.restaurantId,
    });
    if (!membership) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Membresía no encontrada" });
    }
    assertEditableMembership(membership.roleCode);
    await setRestaurantUserActive({
      db: ctx.db,
      isActive: input.isActive,
      membershipId: input.membershipId,
      restaurantId: ctx.tenant.restaurantId,
    });
    return getRestaurantUser({ db: ctx.db, membershipId: input.membershipId, restaurantId: ctx.tenant.restaurantId });
  }),

  resendInvite: tenantProcedure.input(membershipIdSchema).mutation(async ({ ctx, input }) => {
    requirePermission(ctx.tenant, "users.manage");
    const membership = await getRestaurantUser({
      db: ctx.db,
      membershipId: input.membershipId,
      restaurantId: ctx.tenant.restaurantId,
    });
    if (!membership) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Membresía no encontrada" });
    }
    assertEditableMembership(membership.roleCode);
    if (!membership.isActive) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Solo puedes reenviar acceso a membresías activas" });
    }

    const restaurantName = await getRestaurantName(ctx.tenant.restaurantId, ctx.db);
    const invitation = await sendAndPersistInvite({
      db: ctx.db,
      email: membership.email,
      emailWorker: ctx.env.EMAIL_WORKER,
      membershipId: membership.membershipId,
      panelUrl: new URL("/login", ctx.env.ADMIN_APP_URL).href,
      restaurantId: ctx.tenant.restaurantId,
      restaurantName,
      userName: membership.name,
    });
    const user =
      (await getRestaurantUser({
        db: ctx.db,
        membershipId: membership.membershipId,
        restaurantId: ctx.tenant.restaurantId,
      })) ?? membership;

    return { invitation: { errorCode: invitation.errorCode, status: user.inviteStatus }, user };
  }),
});
