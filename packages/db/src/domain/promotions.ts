export interface PromotionLike {
  endsAt: number | null;
  isRecurring: boolean;
  recurringDays: string | null;
  recurringEndMinute: number | null;
  recurringStartMinute: number | null;
  startsAt: number | null;
}

export interface PromotionCandidateLike extends PromotionLike {
  dishId: string;
  effectiveUnitPrice: number;
  priority: number;
  promotionId: string;
}

export function parseRecurringDays(value: string | null): number[] {
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

export function isPromotionLikeActiveNow({ nowMs, promotion }: { nowMs: number; promotion: PromotionLike }): boolean {
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

function shouldReplacePromotion<TCandidate extends PromotionCandidateLike>({
  current,
  next,
}: {
  current: TCandidate | undefined;
  next: TCandidate;
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

export function createBestPromotionMap<TCandidate extends PromotionCandidateLike>({
  candidates,
  nowMs,
}: {
  candidates: TCandidate[];
  nowMs: number;
}): Map<string, TCandidate> {
  const map = new Map<string, TCandidate>();

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
