import { and, asc, count, desc, eq, gte, isNull, or, sql } from "drizzle-orm";

import { customerRestaurants, customerVisits, customers } from "../schema/customers";
import { loyaltyRedemptions, loyaltyRewards, loyaltyTransactions } from "../schema/loyalty";
import { dishes } from "../schema/menu";

import type { DrizzleDb } from "../client";
import type { LoyaltyRewardType } from "../models/loyalty";

interface RestaurantInput {
  db: DrizzleDb;
  restaurantId: string;
}

export interface LoyaltySummary {
  activeCards: number;
  stampsThisMonth: number;
  redemptionsThisMonth: number;
  redemptionRate: number;
  repeatVisitRate: number;
}

interface GetLoyaltySummaryInput extends RestaurantInput {
  monthStart: number;
}

export async function getLoyaltySummary({
  db,
  restaurantId,
  monthStart,
}: GetLoyaltySummaryInput): Promise<LoyaltySummary> {
  const redemptionsFilter = and(
    eq(loyaltyRedemptions.restaurantId, restaurantId),
    eq(loyaltyRedemptions.status, "validated"),
    gte(loyaltyRedemptions.validatedAt, monthStart),
  );

  const [cardsRow, ledgerRow, redemptionsRow, visitsRow] = await Promise.all([
    db
      .select({ activeCards: count() })
      .from(customerRestaurants)
      .where(eq(customerRestaurants.restaurantId, restaurantId))
      .get(),
    db
      .select({
        earned: sql<number>`coalesce(sum(case when ${loyaltyTransactions.type} = 'earn' then ${loyaltyTransactions.points} else 0 end), 0)`,
        redeemed: sql<number>`coalesce(sum(case when ${loyaltyTransactions.type} = 'redeem' then -${loyaltyTransactions.points} else 0 end), 0)`,
        stampsThisMonth: sql<number>`coalesce(sum(case when ${loyaltyTransactions.type} = 'earn' and ${loyaltyTransactions.createdAt} >= ${monthStart} then ${loyaltyTransactions.points} else 0 end), 0)`,
      })
      .from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.restaurantId, restaurantId))
      .get(),
    db.select({ redemptionsThisMonth: count() }).from(loyaltyRedemptions).where(redemptionsFilter).get(),
    db.all<{ visitors: number; repeaters: number }>(sql`
      SELECT COUNT(*) AS visitors, SUM(CASE WHEN n >= 2 THEN 1 ELSE 0 END) AS repeaters
      FROM (
        SELECT customer_id, COUNT(*) AS n FROM customer_visits
        WHERE restaurant_id = ${restaurantId}
        GROUP BY customer_id
      )
    `),
  ]);

  const visitorsRow = visitsRow[0];
  const visitors = Number(visitorsRow?.visitors ?? 0);
  const repeaters = Number(visitorsRow?.repeaters ?? 0);
  const earned = Number(ledgerRow?.earned ?? 0);
  const redeemed = Number(ledgerRow?.redeemed ?? 0);

  return {
    activeCards: cardsRow?.activeCards ?? 0,
    stampsThisMonth: Number(ledgerRow?.stampsThisMonth ?? 0),
    redemptionsThisMonth: redemptionsRow?.redemptionsThisMonth ?? 0,
    redemptionRate: earned > 0 ? redeemed / earned : 0,
    repeatVisitRate: visitors > 0 ? repeaters / visitors : 0,
  };
}

export type LoyaltyCustomerSortBy =
  "email" | "firstVisitAt" | "lastVisitAt" | "rewardsRedeemed" | "stampsBalance" | "totalVisits";
export type SortDir = "asc" | "desc";

export interface LoyaltyCustomerRow {
  customerId: string;
  email: string;
  stampsBalance: number;
  totalVisits: number;
  firstVisitAt: number | null;
  lastVisitAt: number | null;
  rewardsRedeemed: number;
}

interface ListLoyaltyCustomersInput extends RestaurantInput {
  search: string | null;
  sortBy: LoyaltyCustomerSortBy;
  sortDir: SortDir;
  page: number;
  pageSize: number;
  inactiveBefore: number | null;
}

export interface LoyaltyCustomerPage {
  rows: LoyaltyCustomerRow[];
  total: number;
  page: number;
  pageSize: number;
}

const totalVisitsExpr = sql<number>`(SELECT COUNT(*) FROM customer_visits v WHERE v.customer_id = ${customerRestaurants.customerId} AND v.restaurant_id = ${customerRestaurants.restaurantId})`;
const rewardsRedeemedExpr = sql<number>`(SELECT COUNT(*) FROM loyalty_redemptions r WHERE r.customer_id = ${customerRestaurants.customerId} AND r.restaurant_id = ${customerRestaurants.restaurantId} AND r.status = 'validated')`;

function buildSortColumn(sortBy: LoyaltyCustomerSortBy) {
  switch (sortBy) {
    case "email":
      return customers.email;
    case "stampsBalance":
      return customerRestaurants.stampsBalance;
    case "totalVisits":
      return totalVisitsExpr;
    case "firstVisitAt":
      return customerRestaurants.firstVisitAt;
    case "lastVisitAt":
      return customerRestaurants.lastVisitAt;
    case "rewardsRedeemed":
      return rewardsRedeemedExpr;
  }
}

export async function listLoyaltyCustomers({
  db,
  restaurantId,
  search,
  sortBy,
  sortDir,
  page,
  pageSize,
  inactiveBefore,
}: ListLoyaltyCustomersInput): Promise<LoyaltyCustomerPage> {
  const conditions = [eq(customerRestaurants.restaurantId, restaurantId)];

  if (search) {
    const escapeCharacter = String.fromCodePoint(92);
    const escaped = search
      .replaceAll(escapeCharacter, () => escapeCharacter.repeat(2))
      .replaceAll("%", () => escapeCharacter.concat("%"))
      .replaceAll("_", () => escapeCharacter.concat("_"));
    const pattern = `%${escaped}%`;
    conditions.push(sql`${customers.email} LIKE ${pattern} ESCAPE ${escapeCharacter}`);
  }

  if (inactiveBefore !== null) {
    const inactiveCondition = or(
      isNull(customerRestaurants.lastVisitAt),
      sql`${customerRestaurants.lastVisitAt} < ${inactiveBefore}`,
    );

    if (inactiveCondition) {
      conditions.push(inactiveCondition);
    }
  }

  const where = and(...conditions);
  const sortColumn = buildSortColumn(sortBy);
  const orderFn = sortDir === "asc" ? asc : desc;

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        customerId: customerRestaurants.customerId,
        email: customers.email,
        stampsBalance: customerRestaurants.stampsBalance,
        totalVisits: totalVisitsExpr,
        firstVisitAt: customerRestaurants.firstVisitAt,
        lastVisitAt: customerRestaurants.lastVisitAt,
        rewardsRedeemed: rewardsRedeemedExpr,
      })
      .from(customerRestaurants)
      .innerJoin(customers, eq(customers.id, customerRestaurants.customerId))
      .where(where)
      .orderBy(orderFn(sortColumn), asc(customers.email))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .all(),
    db
      .select({ total: count() })
      .from(customerRestaurants)
      .innerJoin(customers, eq(customers.id, customerRestaurants.customerId))
      .where(where)
      .get(),
  ]);

  return { rows, total: totalRow?.total ?? 0, page, pageSize };
}

export interface VisitsSeriesPoint {
  day: string;
  total: number;
  newVisits: number;
  returningVisits: number;
}

interface GetVisitsSeriesInput extends RestaurantInput {
  from: number;
  to: number;
}

export async function getVisitsSeries({
  db,
  restaurantId,
  from,
  to,
}: GetVisitsSeriesInput): Promise<VisitsSeriesPoint[]> {
  const rows = await db.all<{ day: string; total: number; new_visits: number }>(sql`
    SELECT date(v.created_at / 1000, 'unixepoch') AS day,
           COUNT(*) AS total,
           SUM(CASE WHEN v.created_at <= cr.first_visit_at THEN 1 ELSE 0 END) AS new_visits
    FROM ${customerVisits} v
    JOIN ${customerRestaurants} cr ON cr.customer_id = v.customer_id AND cr.restaurant_id = v.restaurant_id
    WHERE v.restaurant_id = ${restaurantId} AND v.created_at BETWEEN ${from} AND ${to}
    GROUP BY day
    ORDER BY day
  `);

  return rows.map((row) => {
    const total = Number(row.total);
    const newVisits = Number(row.new_visits);

    return { day: row.day, total, newVisits, returningVisits: total - newVisits };
  });
}

export interface RedemptionReturnRow {
  validatedAt: number;
  cost: number;
  type: LoyaltyRewardType;
  percentage: number | null;
  specialPrice: number | null;
  dishPrice: number | null;
}

/** Raw rows behind the loyalty-return estimate — one per validated redemption, aggregated by the caller. */
export async function listValidatedRedemptionsForReturn({
  db,
  restaurantId,
}: RestaurantInput): Promise<RedemptionReturnRow[]> {
  const rows = await db
    .select({
      validatedAt: loyaltyRedemptions.validatedAt,
      cost: loyaltyRedemptions.cost,
      type: loyaltyRewards.type,
      percentage: loyaltyRewards.percentage,
      specialPrice: loyaltyRewards.specialPrice,
      dishPrice: dishes.price,
    })
    .from(loyaltyRedemptions)
    .innerJoin(loyaltyRewards, eq(loyaltyRewards.id, loyaltyRedemptions.rewardId))
    .leftJoin(dishes, eq(dishes.id, loyaltyRewards.freeDishId))
    .where(and(eq(loyaltyRedemptions.restaurantId, restaurantId), eq(loyaltyRedemptions.status, "validated")))
    .all();

  return rows
    .filter((row): row is typeof row & { validatedAt: number } => row.validatedAt !== null)
    .map((row) => ({ ...row, dishPrice: row.dishPrice ?? null }));
}
