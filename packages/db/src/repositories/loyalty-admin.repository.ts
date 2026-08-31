import { and, asc, count, eq, isNull } from "drizzle-orm";

import { loyaltyPrograms, loyaltyRewards } from "../schema/loyalty";
import { dishes } from "../schema/menu";

import type { DrizzleDb } from "../client";
import type { LoyaltyProgramState, LoyaltyRewardType, LoyaltyRewardView } from "../models/loyalty";

interface RestaurantInput {
  db: DrizzleDb;
  restaurantId: string;
}

interface LoyaltyProgramRules {
  ticketMedio: number | null;
}

function parseRules(rulesJson: string | null): LoyaltyProgramRules {
  if (!rulesJson) {
    return { ticketMedio: null };
  }

  try {
    const parsed: unknown = JSON.parse(rulesJson);
    const ticketMedio = (parsed as Partial<LoyaltyProgramRules>).ticketMedio;

    return { ticketMedio: typeof ticketMedio === "number" ? ticketMedio : null };
  } catch {
    return { ticketMedio: null };
  }
}

export async function getLoyaltyProgram({ db, restaurantId }: RestaurantInput): Promise<LoyaltyProgramState | null> {
  const row = await db
    .select({
      type: loyaltyPrograms.type,
      isActive: loyaltyPrograms.isActive,
      stampsPerVisit: loyaltyPrograms.stampsPerVisit,
      rulesJson: loyaltyPrograms.rulesJson,
    })
    .from(loyaltyPrograms)
    .where(eq(loyaltyPrograms.restaurantId, restaurantId))
    .get();

  if (!row) {
    return null;
  }

  const { rulesJson, ...rest } = row;

  return { ...rest, ...parseRules(rulesJson) };
}

interface SaveLoyaltyProgramInput extends RestaurantInput {
  isActive: boolean;
  ticketMedio: number | null;
}

/** v1 is stamps-only: type and stampsPerVisit are fixed, points columns stay zeroed. */
export async function saveLoyaltyProgram({
  db,
  restaurantId,
  isActive,
  ticketMedio,
}: SaveLoyaltyProgramInput): Promise<void> {
  const now = Date.now();
  const rulesJson = JSON.stringify({ ticketMedio } satisfies LoyaltyProgramRules);

  await db
    .insert(loyaltyPrograms)
    .values({
      restaurantId,
      type: "stamps",
      pointsPerCurrencyUnit: 0,
      pointsPerVisit: 0,
      stampsPerVisit: 1,
      rulesJson,
      isActive,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: loyaltyPrograms.restaurantId,
      set: { isActive, rulesJson, updatedAt: now },
    });
}

interface ListRewardsInput extends RestaurantInput {
  includeInactive: boolean;
}

export async function listRewards({
  db,
  restaurantId,
  includeInactive,
}: ListRewardsInput): Promise<LoyaltyRewardView[]> {
  const conditions = [eq(loyaltyRewards.restaurantId, restaurantId), isNull(loyaltyRewards.deletedAt)];

  if (!includeInactive) {
    conditions.push(eq(loyaltyRewards.isActive, true));
  }

  const rows = await db
    .select({
      id: loyaltyRewards.id,
      name: loyaltyRewards.name,
      description: loyaltyRewards.description,
      cost: loyaltyRewards.cost,
      type: loyaltyRewards.type,
      percentage: loyaltyRewards.percentage,
      specialPrice: loyaltyRewards.specialPrice,
      freeDishId: loyaltyRewards.freeDishId,
      freeDishName: dishes.name,
      isActive: loyaltyRewards.isActive,
    })
    .from(loyaltyRewards)
    .leftJoin(dishes, eq(dishes.id, loyaltyRewards.freeDishId))
    .where(and(...conditions))
    .orderBy(asc(loyaltyRewards.cost))
    .all();

  return rows.map((row) => ({ ...row, freeDishName: row.freeDishName ?? null }));
}

export async function countActiveRewards({ db, restaurantId }: RestaurantInput): Promise<number> {
  const row = await db
    .select({ count: count() })
    .from(loyaltyRewards)
    .where(
      and(
        eq(loyaltyRewards.restaurantId, restaurantId),
        eq(loyaltyRewards.isActive, true),
        isNull(loyaltyRewards.deletedAt),
      ),
    )
    .get();

  return row?.count ?? 0;
}

interface GetRewardInput extends RestaurantInput {
  rewardId: string;
}

export async function getReward({ db, restaurantId, rewardId }: GetRewardInput): Promise<LoyaltyRewardView | null> {
  const row = await db
    .select({
      id: loyaltyRewards.id,
      name: loyaltyRewards.name,
      description: loyaltyRewards.description,
      cost: loyaltyRewards.cost,
      type: loyaltyRewards.type,
      percentage: loyaltyRewards.percentage,
      specialPrice: loyaltyRewards.specialPrice,
      freeDishId: loyaltyRewards.freeDishId,
      freeDishName: dishes.name,
      isActive: loyaltyRewards.isActive,
    })
    .from(loyaltyRewards)
    .leftJoin(dishes, eq(dishes.id, loyaltyRewards.freeDishId))
    .where(
      and(
        eq(loyaltyRewards.id, rewardId),
        eq(loyaltyRewards.restaurantId, restaurantId),
        isNull(loyaltyRewards.deletedAt),
      ),
    )
    .get();

  if (!row) {
    return null;
  }

  return { ...row, freeDishName: row.freeDishName ?? null };
}

export interface RewardWriteData {
  name: string;
  description: string | null;
  cost: number;
  type: LoyaltyRewardType;
  percentage: number | null;
  specialPrice: number | null;
  freeDishId: string | null;
  isActive: boolean;
}

interface CreateRewardInput extends RestaurantInput {
  data: RewardWriteData;
}

export async function createReward({ db, restaurantId, data }: CreateRewardInput): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.insert(loyaltyRewards).values({
    id,
    restaurantId,
    name: data.name,
    description: data.description,
    cost: data.cost,
    type: data.type,
    percentage: data.percentage,
    specialPrice: data.specialPrice,
    freeDishId: data.freeDishId,
    isActive: data.isActive,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

interface UpdateRewardInput extends RestaurantInput {
  rewardId: string;
  data: RewardWriteData;
}

export async function updateReward({ db, restaurantId, rewardId, data }: UpdateRewardInput): Promise<void> {
  await db
    .update(loyaltyRewards)
    .set({
      name: data.name,
      description: data.description,
      cost: data.cost,
      type: data.type,
      percentage: data.percentage,
      specialPrice: data.specialPrice,
      freeDishId: data.freeDishId,
      isActive: data.isActive,
      updatedAt: Date.now(),
    })
    .where(and(eq(loyaltyRewards.id, rewardId), eq(loyaltyRewards.restaurantId, restaurantId)));
}

interface SoftDeleteRewardInput extends RestaurantInput {
  rewardId: string;
}

export async function softDeleteReward({ db, restaurantId, rewardId }: SoftDeleteRewardInput): Promise<void> {
  const now = Date.now();

  await db
    .update(loyaltyRewards)
    .set({ deletedAt: now, updatedAt: now, isActive: false })
    .where(and(eq(loyaltyRewards.id, rewardId), eq(loyaltyRewards.restaurantId, restaurantId)));
}

interface DishBelongsToRestaurantInput extends RestaurantInput {
  dishId: string;
}

export async function dishBelongsToRestaurant({
  db,
  restaurantId,
  dishId,
}: DishBelongsToRestaurantInput): Promise<boolean> {
  const row = await db
    .select({ id: dishes.id })
    .from(dishes)
    .where(and(eq(dishes.id, dishId), eq(dishes.restaurantId, restaurantId), isNull(dishes.deletedAt)))
    .get();

  return row !== undefined;
}
