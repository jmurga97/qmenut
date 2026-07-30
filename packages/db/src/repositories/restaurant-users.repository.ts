import { and, eq } from "drizzle-orm";

export type { RestaurantRoleCode } from "@qmenut/permissions";

import { restaurantUsers } from "../schema/restaurants";

import type { DrizzleDb } from "../client";
import type { RestaurantRoleCode } from "@qmenut/permissions";

export interface RestaurantMembership {
  id: string;
  restaurantId: string;
  roleCode: RestaurantRoleCode;
  isActive: boolean;
}

interface FindMembershipByUserIdInput {
  db: DrizzleDb;
  userId: string;
}

export async function findMembershipByUserId({
  db,
  userId,
}: FindMembershipByUserIdInput): Promise<RestaurantMembership | null> {
  const row = await db
    .select({
      id: restaurantUsers.id,
      restaurantId: restaurantUsers.restaurantId,
      roleCode: restaurantUsers.roleCode,
      isActive: restaurantUsers.isActive,
    })
    .from(restaurantUsers)
    .where(and(eq(restaurantUsers.userId, userId), eq(restaurantUsers.isActive, true)))
    .orderBy(restaurantUsers.createdAt)
    .get();

  return row ?? null;
}
