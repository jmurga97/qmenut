import { addDays, lastCompleteDay } from "../analytics/digest/digest-periods";

import type { analyticsPeriodSchema } from "./admin-analytics-input.schema";
import type { z } from "zod";

export type AnalyticsPeriod = z.infer<typeof analyticsPeriodSchema>;

export interface AnalyticsPeriodBounds {
  comparisonFromDay: string;
  comparisonToDay: string;
  fromDay: string;
  toDay: string;
}

const PERIOD_DAYS: Record<AnalyticsPeriod, number> = {
  "15d": 15,
  "30d": 30,
  "90d": 90,
};

export function resolveAnalyticsPeriod({
  nowMs = Date.now(),
  period,
}: {
  nowMs?: number;
  period: AnalyticsPeriod;
}): AnalyticsPeriodBounds {
  const days = PERIOD_DAYS[period];
  const toDay = lastCompleteDay(nowMs);
  const fromDay = addDays(toDay, -(days - 1));
  const comparisonToDay = addDays(fromDay, -1);
  const comparisonFromDay = addDays(comparisonToDay, -(days - 1));

  return { comparisonFromDay, comparisonToDay, fromDay, toDay };
}
