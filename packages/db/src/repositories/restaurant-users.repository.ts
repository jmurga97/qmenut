import { and, eq, isNull } from "drizzle-orm";

export type { RestaurantRoleCode } from "@qmenut/permissions";

import { restaurantUsers, restaurants } from "../schema/restaurants";

import type { DrizzleDb } from "../client";
import type { RestaurantRoleCode } from "@qmenut/permissions";

export interface RestaurantMembership {
  id: string;
  restaurantId: string;
  roleCode: RestaurantRoleCode;
  isActive: boolean;
}

export interface ActiveMembership extends RestaurantMembership {
  restaurantName: string;
}

interface UserIdInput {
  db: DrizzleDb;
  userId: string;
}

interface ResolveActiveMembershipInput extends UserIdInput {
  activeRestaurantId: string | null;
}

const membershipColumns = {
  id: restaurantUsers.id,
  restaurantId: restaurantUsers.restaurantId,
  roleCode: restaurantUsers.roleCode,
  isActive: restaurantUsers.isActive,
  restaurantName: restaurants.name,
};

function activeMembershipWhere(userId: string) {
  return and(eq(restaurantUsers.userId, userId), eq(restaurantUsers.isActive, true), isNull(restaurants.deletedAt));
}

export async function findActiveMembershipsByUserId({ db, userId }: UserIdInput): Promise<ActiveMembership[]> {
  const rows = await db
    .select(membershipColumns)
    .from(restaurantUsers)
    .innerJoin(restaurants, eq(restaurants.id, restaurantUsers.restaurantId))
    .where(activeMembershipWhere(userId))
    .orderBy(restaurants.name)
    .all();

  return rows;
}

export async function resolveActiveMembership({
  activeRestaurantId,
  db,
  userId,
}: ResolveActiveMembershipInput): Promise<ActiveMembership | null> {
  if (activeRestaurantId) {
    const selected = await db
      .select(membershipColumns)
      .from(restaurantUsers)
      .innerJoin(restaurants, eq(restaurants.id, restaurantUsers.restaurantId))
      .where(and(activeMembershipWhere(userId), eq(restaurantUsers.restaurantId, activeRestaurantId)))
      .get();

    if (selected) {
      return selected;
    }
  }

  const memberships = await findActiveMembershipsByUserId({ db, userId });

  return memberships.length === 1 ? memberships[0] : null;
}
