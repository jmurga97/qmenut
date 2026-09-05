import {
  getLoyaltySummary,
  getVisitsSeries,
  listLoyaltyCustomers,
} from "@qmenut/db/repositories/loyalty-insights.repository";
import { TRPCError } from "@trpc/server";

import type { DrizzleDb } from "@qmenut/db/client";
import type {
  LoyaltyCustomerPage,
  LoyaltyCustomerSortBy,
  LoyaltySummary,
  SortDir,
  VisitsSeriesPoint,
} from "@qmenut/db/repositories/loyalty-insights.repository";

const MAX_RANGE_MS = 366 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

interface RestaurantInput {
  db: DrizzleDb;
  restaurantId: string;
}

export function getLoyaltyInsightsSummary({ db, restaurantId }: RestaurantInput): Promise<LoyaltySummary> {
  const now = new Date();
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);

  return getLoyaltySummary({ db, restaurantId, monthStart });
}

interface ListInsightsCustomersInput extends RestaurantInput {
  search: string | null;
  sortBy: LoyaltyCustomerSortBy;
  sortDir: SortDir;
  page: number;
  pageSize: number;
  inactiveDays: number | null;
}

export function listInsightsCustomers({
  db,
  restaurantId,
  search,
  sortBy,
  sortDir,
  page,
  pageSize,
  inactiveDays,
}: ListInsightsCustomersInput): Promise<LoyaltyCustomerPage> {
  const inactiveBefore = inactiveDays === null ? null : Date.now() - inactiveDays * DAY_MS;

  return listLoyaltyCustomers({ db, restaurantId, search, sortBy, sortDir, page, pageSize, inactiveBefore });
}

interface GetInsightsVisitsChartInput extends RestaurantInput {
  from: number;
  to: number;
}

export function getInsightsVisitsChart({
  db,
  restaurantId,
  from,
  to,
}: GetInsightsVisitsChartInput): Promise<VisitsSeriesPoint[]> {
  if (to <= from) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "`to` debe ser posterior a `from`" });
  }

  if (to - from > MAX_RANGE_MS) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "El intervalo no puede superar los 366 días" });
  }

  return getVisitsSeries({ db, restaurantId, from, to });
}
