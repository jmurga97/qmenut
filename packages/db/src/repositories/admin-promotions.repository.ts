import { and, asc, eq, isNull } from "drizzle-orm";

import { promotionTargets, promotions } from "../schema/promotions";

import type { DrizzleDb } from "../client";

export type PromotionType = "percentage_discount" | "special_price" | "daily_menu" | "happy_hour" | "two_for_one";
export type PromotionScope = "info" | "branch" | "category" | "dish";
export type PromotionStatus = "active" | "inactive" | "expired";
export type PromotionTargetType = "dish" | "category";

export interface PromotionTargetRow {
  targetType: PromotionTargetType;
  targetId: string;
}

export interface AdminPromotionListItem {
  id: string;
  name: string;
  type: PromotionType;
  scope: PromotionScope;
  status: PromotionStatus;
}

export interface PromotionWriteData {
  type: PromotionType;
  scope: PromotionScope;
  name: string;
  description: string | null;
  percentage: number | null;
  specialPrice: number | null;
  priority: number;
  startsAt: number | null;
  endsAt: number | null;
  isRecurring: boolean;
  recurringDays: string | null;
  recurringStartMinute: number | null;
  recurringEndMinute: number | null;
  status: PromotionStatus;
}

export interface AdminPromotionDetail extends PromotionWriteData {
  id: string;
  targets: PromotionTargetRow[];
}

interface ListPromotionsInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
}

export async function listPromotions({
  db,
  restaurantId,
  branchId,
}: ListPromotionsInput): Promise<AdminPromotionListItem[]> {
  return db
    .select({
      id: promotions.id,
      name: promotions.name,
      type: promotions.type,
      scope: promotions.scope,
      status: promotions.status,
    })
    .from(promotions)
    .where(
      and(eq(promotions.restaurantId, restaurantId), eq(promotions.branchId, branchId), isNull(promotions.deletedAt)),
    )
    .orderBy(asc(promotions.priority))
    .all();
}

interface GetPromotionInput {
  db: DrizzleDb;
  restaurantId: string;
  promotionId: string;
}

export async function getPromotion({
  db,
  restaurantId,
  promotionId,
}: GetPromotionInput): Promise<AdminPromotionDetail | null> {
  const promotion = await db
    .select()
    .from(promotions)
    .where(and(eq(promotions.id, promotionId), eq(promotions.restaurantId, restaurantId), isNull(promotions.deletedAt)))
    .get();

  if (!promotion) {
    return null;
  }

  const targets = await db
    .select({ targetType: promotionTargets.targetType, targetId: promotionTargets.targetId })
    .from(promotionTargets)
    .where(eq(promotionTargets.promotionId, promotionId))
    .all();

  return {
    id: promotion.id,
    type: promotion.type,
    scope: promotion.scope,
    name: promotion.name,
    description: promotion.description,
    percentage: promotion.percentage,
    specialPrice: promotion.specialPrice,
    priority: promotion.priority,
    startsAt: promotion.startsAt,
    endsAt: promotion.endsAt,
    isRecurring: promotion.isRecurring,
    recurringDays: promotion.recurringDays,
    recurringStartMinute: promotion.recurringStartMinute,
    recurringEndMinute: promotion.recurringEndMinute,
    status: promotion.status,
    targets,
  };
}

interface CreatePromotionInput {
  db: DrizzleDb;
  restaurantId: string;
  branchId: string;
  data: PromotionWriteData;
  targets: PromotionTargetRow[];
}

export async function createPromotion({
  db,
  restaurantId,
  branchId,
  data,
  targets,
}: CreatePromotionInput): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.insert(promotions).values({
    id,
    restaurantId,
    branchId,
    type: data.type,
    scope: data.scope,
    name: data.name,
    description: data.description,
    percentage: data.percentage,
    specialPrice: data.specialPrice,
    buyQuantity: null,
    paidQuantity: null,
    priority: data.priority,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    isRecurring: data.isRecurring,
    recurringDays: data.recurringDays,
    recurringStartMinute: data.recurringStartMinute,
    recurringEndMinute: data.recurringEndMinute,
    status: data.status,
    createdAt: now,
    updatedAt: now,
  });

  await replacePromotionTargets({ db, promotionId: id, targets });

  return id;
}

interface UpdatePromotionInput {
  db: DrizzleDb;
  restaurantId: string;
  promotionId: string;
  data: PromotionWriteData;
  targets: PromotionTargetRow[];
}

export async function updatePromotion({
  db,
  restaurantId,
  promotionId,
  data,
  targets,
}: UpdatePromotionInput): Promise<void> {
  await db
    .update(promotions)
    .set({
      type: data.type,
      scope: data.scope,
      name: data.name,
      description: data.description,
      percentage: data.percentage,
      specialPrice: data.specialPrice,
      priority: data.priority,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      isRecurring: data.isRecurring,
      recurringDays: data.recurringDays,
      recurringStartMinute: data.recurringStartMinute,
      recurringEndMinute: data.recurringEndMinute,
      status: data.status,
      updatedAt: Date.now(),
    })
    .where(and(eq(promotions.id, promotionId), eq(promotions.restaurantId, restaurantId)));

  await replacePromotionTargets({ db, promotionId, targets });
}

interface ReplacePromotionTargetsInput {
  db: DrizzleDb;
  promotionId: string;
  targets: PromotionTargetRow[];
}

export async function replacePromotionTargets({
  db,
  promotionId,
  targets,
}: ReplacePromotionTargetsInput): Promise<void> {
  await db.delete(promotionTargets).where(eq(promotionTargets.promotionId, promotionId));

  if (targets.length > 0) {
    await db
      .insert(promotionTargets)
      .values(targets.map((target) => ({ promotionId, targetType: target.targetType, targetId: target.targetId })));
  }
}

interface SoftDeletePromotionInput {
  db: DrizzleDb;
  restaurantId: string;
  promotionId: string;
}

export async function softDeletePromotion({ db, restaurantId, promotionId }: SoftDeletePromotionInput): Promise<void> {
  const now = Date.now();

  await db
    .update(promotions)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(promotions.id, promotionId), eq(promotions.restaurantId, restaurantId)));
}
