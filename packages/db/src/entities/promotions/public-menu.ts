import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { promotions, vDishPromotionPrices } from "./schema";

import type { TenantIdsInput, TenantInput } from "../../repositories/public-menu/shared";

export interface PublicPromotion {
  buyQuantity: number | null;
  description: string | null;
  endsAt: number | null;
  id: string;
  name: string;
  paidQuantity: number | null;
  percentage: number | null;
  priority: number;
  recurringDays: number[];
  recurringEndMinute: number | null;
  recurringStartMinute: number | null;
  scope: "branch" | "category" | "dish" | "info";
  specialPrice: number | null;
  startsAt: number | null;
  type: "daily_menu" | "happy_hour" | "percentage_discount" | "special_price" | "two_for_one";
}

export interface PublicDishPromotion extends PublicPromotion {
  basePrice: number;
  effectiveUnitPrice: number;
}

export type PromotionRow = typeof promotions.$inferSelect;
export type PromotionCandidateRow = typeof vDishPromotionPrices.$inferSelect;

function parseRecurringDays(value: string | null): number[] {
  return (
    value
      ?.split(",")
      .map((day) => Number.parseInt(day.trim(), 10))
      .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7) ?? []
  );
}

function getIsoDay(date: Date): number {
  const day = date.getUTCDay();

  if (day === 0) {
    return 7;
  }

  return day;
}

function isMinuteInWindow({
  currentMinute,
  endMinute,
  startMinute,
}: {
  currentMinute: number;
  endMinute: number | null;
  startMinute: number | null;
}): boolean {
  if (startMinute === null && endMinute === null) {
    return true;
  }

  if (startMinute === null) {
    return endMinute === null || currentMinute <= endMinute;
  }

  if (endMinute === null) {
    return currentMinute >= startMinute;
  }

  if (startMinute <= endMinute) {
    return currentMinute >= startMinute && currentMinute <= endMinute;
  }

  return currentMinute >= startMinute || currentMinute <= endMinute;
}

export function isPromotionLikeActiveNow({
  nowMs,
  promotion,
}: {
  nowMs: number;
  promotion: Pick<
    PromotionRow,
    "endsAt" | "isRecurring" | "recurringDays" | "recurringEndMinute" | "recurringStartMinute" | "startsAt"
  >;
}): boolean {
  if (promotion.startsAt !== null && nowMs < promotion.startsAt) {
    return false;
  }

  if (promotion.endsAt !== null && nowMs > promotion.endsAt) {
    return false;
  }

  if (!promotion.isRecurring) {
    return true;
  }

  const now = new Date(nowMs);
  const recurringDays = parseRecurringDays(promotion.recurringDays);

  if (recurringDays.length > 0 && !recurringDays.includes(getIsoDay(now))) {
    return false;
  }

  return isMinuteInWindow({
    currentMinute: now.getUTCHours() * 60 + now.getUTCMinutes(),
    startMinute: promotion.recurringStartMinute,
    endMinute: promotion.recurringEndMinute,
  });
}

export function mapPromotion(row: PromotionRow): PublicPromotion {
  return {
    id: row.id,
    type: row.type,
    scope: row.scope,
    name: row.name,
    description: row.description,
    percentage: row.percentage,
    specialPrice: row.specialPrice,
    buyQuantity: row.buyQuantity,
    paidQuantity: row.paidQuantity,
    priority: row.priority,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    recurringDays: parseRecurringDays(row.recurringDays),
    recurringStartMinute: row.recurringStartMinute,
    recurringEndMinute: row.recurringEndMinute,
  };
}

export function mapDishPromotion({
  candidate,
  promotion,
}: {
  candidate: PromotionCandidateRow;
  promotion: PromotionRow;
}): PublicDishPromotion {
  return {
    ...mapPromotion(promotion),
    basePrice: candidate.basePrice,
    effectiveUnitPrice: candidate.effectiveUnitPrice,
  };
}

function shouldReplacePromotion({
  current,
  next,
}: {
  current: PromotionCandidateRow | undefined;
  next: PromotionCandidateRow;
}): boolean {
  if (!current) {
    return true;
  }

  if (next.priority !== current.priority) {
    return next.priority > current.priority;
  }

  if (next.effectiveUnitPrice !== current.effectiveUnitPrice) {
    return next.effectiveUnitPrice < current.effectiveUnitPrice;
  }

  return next.promotionId < current.promotionId;
}

export async function getPromotionRows({ db, tenant }: TenantInput) {
  return db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.branchId, tenant.branchId),
        eq(promotions.restaurantId, tenant.restaurantId),
        isNull(promotions.deletedAt),
        eq(promotions.status, "active"),
      ),
    )
    .orderBy(asc(promotions.priority), asc(promotions.name))
    .all();
}

export async function getPromotionCandidateRows({ db, ids, tenant }: TenantIdsInput) {
  if (ids.length === 0) {
    return [];
  }

  return db
    .select()
    .from(vDishPromotionPrices)
    .where(and(eq(vDishPromotionPrices.branchId, tenant.branchId), inArray(vDishPromotionPrices.dishId, ids)))
    .all();
}

export function createBestPromotionMap({
  candidates,
  nowMs,
}: {
  candidates: PromotionCandidateRow[];
  nowMs: number;
}): Map<string, PromotionCandidateRow> {
  const map = new Map<string, PromotionCandidateRow>();

  for (const candidate of candidates) {
    if (!isPromotionLikeActiveNow({ promotion: candidate, nowMs })) {
      continue;
    }

    const current = map.get(candidate.dishId);

    if (shouldReplacePromotion({ current, next: candidate })) {
      map.set(candidate.dishId, candidate);
    }
  }

  return map;
}
