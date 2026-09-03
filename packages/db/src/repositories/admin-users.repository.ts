import { INTERNAL_SUPPORT_EMAILS } from "@qmenut/permissions";
import { and, asc, eq, ne, sql } from "drizzle-orm";

import { users } from "../schema/auth";
import { restaurantUsers } from "../schema/restaurants";

import type { DrizzleDb } from "../client";
import type { RestaurantRoleCode } from "@qmenut/permissions";

export type InviteStatus = "not_sent" | "sent" | "failed";
export type ManageableRoleCode = Exclude<RestaurantRoleCode, "owner">;

export interface AdminRestaurantUser {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  roleCode: RestaurantRoleCode;
  isActive: boolean;
  inviteStatus: InviteStatus;
  inviteLastErrorCode: string | null;
  inviteLastAttemptAt: number | null;
  inviteSentAt: number | null;
}

interface RestaurantUsersInput {
  db: DrizzleDb;
  restaurantId: string;
}

const adminUserColumns = {
  membershipId: restaurantUsers.id,
  userId: users.id,
  name: users.name,
  email: users.email,
  roleCode: restaurantUsers.roleCode,
  isActive: restaurantUsers.isActive,
  inviteStatus: restaurantUsers.inviteStatus,
  inviteLastErrorCode: restaurantUsers.inviteLastErrorCode,
  inviteLastAttemptAt: restaurantUsers.inviteLastAttemptAt,
  inviteSentAt: restaurantUsers.inviteSentAt,
};

export async function listRestaurantUsers({ db, restaurantId }: RestaurantUsersInput): Promise<AdminRestaurantUser[]> {
  return db
    .select(adminUserColumns)
    .from(restaurantUsers)
    .innerJoin(users, eq(users.id, restaurantUsers.userId))
    .where(
      and(
        eq(restaurantUsers.restaurantId, restaurantId),
        ...INTERNAL_SUPPORT_EMAILS.map((email) => sql`lower(${users.email}) <> ${email}`),
      ),
    )
    .orderBy(asc(users.name), asc(users.email))
    .all();
}

interface GetRestaurantUserInput extends RestaurantUsersInput {
  membershipId: string;
}

export async function getRestaurantUser({
  db,
  membershipId,
  restaurantId,
}: GetRestaurantUserInput): Promise<AdminRestaurantUser | null> {
  const row = await db
    .select(adminUserColumns)
    .from(restaurantUsers)
    .innerJoin(users, eq(users.id, restaurantUsers.userId))
    .where(and(eq(restaurantUsers.id, membershipId), eq(restaurantUsers.restaurantId, restaurantId)))
    .get();

  return row ?? null;
}

interface CreateRestaurantUserInput extends RestaurantUsersInput {
  email: string;
  name: string;
  roleCode: ManageableRoleCode;
}

export async function createRestaurantUser({
  db,
  email,
  name,
  restaurantId,
  roleCode,
}: CreateRestaurantUserInput): Promise<{ created: boolean; user: AdminRestaurantUser }> {
  const userId = crypto.randomUUID();
  const membershipId = crypto.randomUUID();
  const now = Date.now();
  const nowDate = new Date(now);

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .get();

  const userInsert = db
    .insert(users)
    .values({
      id: userId,
      name,
      email,
      emailVerified: true,
      createdAt: nowDate,
      updatedAt: nowDate,
    })
    .onConflictDoNothing({ target: users.email });
  const membershipInsert = db
    .insert(restaurantUsers)
    .values({
      id: membershipId,
      restaurantId,
      userId: sql<string>`(SELECT id FROM users WHERE lower(email) = lower(${email}) LIMIT 1)`,
      roleCode,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: [restaurantUsers.restaurantId, restaurantUsers.userId] });

  if (existingUser) {
    await db.batch([membershipInsert]);
  } else {
    await db.batch([userInsert, membershipInsert]);
  }

  const user = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .get();

  if (!user) {
    throw new Error("Failed to persist or load user account");
  }

  const existingMembership = await db
    .select({ membershipId: restaurantUsers.id })
    .from(restaurantUsers)
    .where(and(eq(restaurantUsers.restaurantId, restaurantId), eq(restaurantUsers.userId, user.id)))
    .get();

  if (!existingMembership) {
    throw new Error("Failed to persist or load restaurant membership");
  }

  const existing = await getRestaurantUser({
    db,
    membershipId: existingMembership.membershipId,
    restaurantId,
  });
  if (!existing) {
    throw new Error("Failed to persist or load restaurant membership");
  }

  return { created: existing.membershipId === membershipId, user: existing };
}

interface UpdateRoleInput extends RestaurantUsersInput {
  membershipId: string;
  roleCode: ManageableRoleCode;
}

export async function updateRestaurantUserRole({
  db,
  membershipId,
  restaurantId,
  roleCode,
}: UpdateRoleInput): Promise<boolean> {
  const result = await db
    .update(restaurantUsers)
    .set({ roleCode, updatedAt: Date.now() })
    .where(
      and(
        eq(restaurantUsers.id, membershipId),
        eq(restaurantUsers.restaurantId, restaurantId),
        ne(restaurantUsers.roleCode, "owner"),
      ),
    )
    .run();

  return result.meta.changes === 1;
}

interface SetActiveInput extends RestaurantUsersInput {
  isActive: boolean;
  membershipId: string;
}

export async function setRestaurantUserActive({
  db,
  isActive,
  membershipId,
  restaurantId,
}: SetActiveInput): Promise<boolean> {
  const result = await db
    .update(restaurantUsers)
    .set({ isActive, updatedAt: Date.now() })
    .where(
      and(
        eq(restaurantUsers.id, membershipId),
        eq(restaurantUsers.restaurantId, restaurantId),
        ne(restaurantUsers.roleCode, "owner"),
      ),
    )
    .run();

  return result.meta.changes === 1;
}

interface UpdateInviteStatusInput extends RestaurantUsersInput {
  inviteLastAttemptAt: number;
  inviteLastErrorCode: string | null;
  inviteSentAt: number | null;
  inviteStatus: InviteStatus;
  membershipId: string;
}

export async function updateRestaurantUserInviteStatus({
  db,
  inviteLastAttemptAt,
  inviteLastErrorCode,
  inviteSentAt,
  inviteStatus,
  membershipId,
  restaurantId,
}: UpdateInviteStatusInput): Promise<boolean> {
  const result = await db
    .update(restaurantUsers)
    .set({
      inviteStatus,
      inviteLastErrorCode,
      inviteLastAttemptAt,
      inviteSentAt,
      updatedAt: Date.now(),
    })
    .where(and(eq(restaurantUsers.id, membershipId), eq(restaurantUsers.restaurantId, restaurantId)))
    .run();

  return result.meta.changes === 1;
}
