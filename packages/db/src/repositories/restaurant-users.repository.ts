import { eq } from "drizzle-orm";

import { restaurantUsers } from "../schema/restaurants";

import type { DrizzleDb } from "../client";

export type RestaurantRoleCode = "owner" | "admin" | "staff";

export interface RestaurantMembership {
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
      restaurantId: restaurantUsers.restaurantId,
      roleCode: restaurantUsers.roleCode,
      isActive: restaurantUsers.isActive,
    })
    .from(restaurantUsers)
    .where(eq(restaurantUsers.userId, userId))
    .get();

  return row ?? null;
}
