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

const ISO_DAY: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export function parseRecurringDays(value: string | null): number[] {
  return (
    value
      ?.split(",")
      .map((day) => Number(day.trim()))
      .filter((day) => Number.isSafeInteger(day) && day >= 1 && day <= 7) ?? []
  );
}

function getLocalDayAndMinute({ nowMs, timeZone }: { nowMs: number; timeZone: string }): {
  isoDay: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(nowMs));
  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = Number(getPart("hour")) % 24;

  return {
    isoDay: ISO_DAY[getPart("weekday")] ?? 1,
    minute: hour * 60 + Number(getPart("minute")),
  };
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
  timeZone,
}: {
  nowMs: number;
  promotion: PromotionLike;
  timeZone: string;
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

  const localTime = getLocalDayAndMinute({ nowMs, timeZone });
  const recurringDays = parseRecurringDays(promotion.recurringDays);

  if (recurringDays.length > 0 && !recurringDays.includes(localTime.isoDay)) {
    return false;
  }

  return isMinuteInWindow({
    currentMinute: localTime.minute,
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
  timeZone,
}: {
  candidates: TCandidate[];
  nowMs: number;
  timeZone: string;
}): Map<string, TCandidate> {
  const map = new Map<string, TCandidate>();

  for (const candidate of candidates) {
    if (!isPromotionLikeActiveNow({ promotion: candidate, nowMs, timeZone })) {
      continue;
    }

    const current = map.get(candidate.dishId);

    if (shouldReplacePromotion({ current, next: candidate })) {
      map.set(candidate.dishId, candidate);
    }
  }

  return map;
}
