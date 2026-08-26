import { findActiveMembershipsByUserId } from "@qmenut/db/repositories/restaurant-users.repository";
import { setSessionActiveRestaurant } from "@qmenut/db/repositories/sessions.repository";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, publicProcedure, router } from "../trpc";

import type { DrizzleDb } from "@qmenut/db/client";

interface FindAccessibleMembershipInput {
  db: DrizzleDb;
  restaurantId: string;
  userId: string;
}

async function findAccessibleMembership({ db, restaurantId, userId }: FindAccessibleMembershipInput) {
  const memberships = await findActiveMembershipsByUserId({ db, userId });
  return memberships.find((membership) => membership.restaurantId === restaurantId);
}

const selectRestaurantSchema = z.object({ restaurantId: z.string().min(1) });

export const authRouter = router({
  session: publicProcedure.query(({ ctx }) => ctx.getSession()),
  listRestaurants: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await findActiveMembershipsByUserId({ db: ctx.db, userId: ctx.session.user.id });

    return memberships.map((membership) => ({
      name: membership.restaurantName,
      restaurantId: membership.restaurantId,
      roleCode: membership.roleCode,
    }));
  }),
  selectRestaurant: protectedProcedure.input(selectRestaurantSchema).mutation(async ({ ctx, input }) => {
    const membership = await findAccessibleMembership({
      db: ctx.db,
      restaurantId: input.restaurantId,
      userId: ctx.session.user.id,
    });

    if (!membership) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este restaurante" });
    }

    await setSessionActiveRestaurant({
      activeRestaurantId: membership.restaurantId,
      db: ctx.db,
      sessionId: ctx.session.session.id,
    });

    return { restaurantId: membership.restaurantId };
  }),
});
