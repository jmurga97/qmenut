import { getLoyaltyProgram } from "@qmenut/db/repositories/loyalty-admin.repository";
import {
  getLoyaltySummary,
  getVisitsSeries,
  listLoyaltyCustomers,
  listValidatedRedemptionsForReturn,
} from "@qmenut/db/repositories/loyalty-insights.repository";
import { TRPCError } from "@trpc/server";

import type { DrizzleDb } from "@qmenut/db/client";
import type {
  LoyaltyCustomerPage,
  LoyaltyCustomerSortBy,
  LoyaltySummary,
  RedemptionReturnRow,
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

export interface LoyaltyReturnPoint {
  month: string;
  estimatedRevenue: number;
  rewardCost: number;
}

export interface LoyaltyReturnResult {
  ticketMedio: number | null;
  points: LoyaltyReturnPoint[];
}

function rewardCostFor(row: RedemptionReturnRow, ticketMedio: number): number {
  switch (row.type) {
    case "free_dish":
      return row.dishPrice ?? 0;
    case "special_price":
      return row.dishPrice !== null && row.specialPrice !== null ? row.dishPrice - row.specialPrice : 0;
    case "percentage_discount":
      return row.percentage === null ? 0 : (row.percentage / 100) * ticketMedio;
  }
}

function monthKey(timestampMs: number): string {
  const date = new Date(timestampMs);

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Estimate only: stamps cost of the reward stands in for visits driven, times the owner-provided ticket medio. */
export async function getLoyaltyReturn({ db, restaurantId }: RestaurantInput): Promise<LoyaltyReturnResult> {
  const program = await getLoyaltyProgram({ db, restaurantId });
  const ticketMedio = program?.ticketMedio ?? null;

  if (ticketMedio === null) {
    return { ticketMedio: null, points: [] };
  }

  const rows = await listValidatedRedemptionsForReturn({ db, restaurantId });
  const byMonth = new Map<string, LoyaltyReturnPoint>();

  for (const row of rows) {
    const month = monthKey(row.validatedAt);
    const bucket = byMonth.get(month) ?? { month, estimatedRevenue: 0, rewardCost: 0 };

    bucket.estimatedRevenue += row.cost * ticketMedio;
    bucket.rewardCost += rewardCostFor(row, ticketMedio);
    byMonth.set(month, bucket);
  }

  const points = byMonth
    .values()
    .toArray()
    .toSorted((a, b) => a.month.localeCompare(b.month));

  return { ticketMedio, points };
}
